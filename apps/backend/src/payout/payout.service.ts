import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma/prisma.service';
import { PAYMENT_GATEWAY, PaymentGateway } from '../payment/gateway/payment-gateway';
import { DomainEvents, EventCancelledPayload } from '../common/events/domain-events';
import {
  addCalendarDays,
  resolveCommissionRate,
  computePayoutAmounts,
  computeCancellationPenalty,
} from './payout.util';
import { EventStatus, PayoutStatus, PenaltyStatus, Prisma } from '@prisma/client';

const MAX_PAYOUT_ATTEMPTS = 3;

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  private get delayDays(): number {
    return Number(this.config.get<string>('ORGANIZER_PAYOUT_DELAY_DAYS', '5'));
  }
  private get freePeriodDays(): number {
    return Number(this.config.get<string>('ORGANIZER_FREE_PERIOD_DAYS', '30'));
  }
  private get standardRate(): number {
    return Number(this.config.get<string>('ORGANIZER_COMMISSION_RATE', '0.05'));
  }

  /**
   * Paso 1: detecta funciones cuya fecha ya pasó (evento no cancelado) y, si tienen
   * entradas confirmadas, programa el payout al organizador. eligibleAt = fin + X días.
   * Idempotente: el `@unique` de eventDateId evita duplicar payouts.
   */
  async closePastEventsAndSchedule(now = new Date()): Promise<{ scheduled: number }> {
    const pastDates = await this.prisma.eventDate.findMany({
      where: {
        endDate: { lt: now },
        event: { status: { not: EventStatus.CANCELLED } },
      },
      include: { event: true },
    });

    const alreadyScheduled = new Set(
      (
        await this.prisma.payout.findMany({
          where: { eventDateId: { in: pastDates.map((d) => d.id) } },
          select: { eventDateId: true },
        })
      ).map((p) => p.eventDateId),
    );

    let scheduled = 0;
    const completedEventIds = new Set<string>();

    for (const date of pastDates) {
      completedEventIds.add(date.eventId);
      if (alreadyScheduled.has(date.id)) continue;

      const ticketsCount = await this.prisma.ticket.count({
        where: { eventDateId: date.id, status: 'CONFIRMED' },
      });
      if (ticketsCount === 0) continue; // nada que liquidar

      const organizer = await this.prisma.user.findUnique({
        where: { id: date.event.organizerId },
        select: { createdAt: true },
      });
      const commissionRate = resolveCommissionRate({
        eventStart: date.startDate,
        organizerCreatedAt: organizer?.createdAt ?? date.event.createdAt,
        freePeriodDays: this.freePeriodDays,
        standardRate: this.standardRate,
      });
      const amounts = computePayoutAmounts({
        unitBasePrice: date.price,
        ticketsCount,
        commissionRate,
      });

      await this.prisma.payout.create({
        data: {
          organizerId: date.event.organizerId,
          eventId: date.eventId,
          eventDateId: date.id,
          grossAmount: amounts.grossAmount,
          commissionRate: amounts.commissionRate,
          commissionAmount: amounts.commissionAmount,
          netAmount: amounts.netAmount,
          currency: date.currency,
          ticketsCount,
          status: PayoutStatus.SCHEDULED,
          eligibleAt: addCalendarDays(date.endDate, this.delayDays),
        },
      });
      scheduled += 1;
      this.logger.log(
        `Payout programado para función ${date.id}: neto ${amounts.netAmount} ${date.currency} (comisión ${commissionRate * 100}%)`,
      );
    }

    // Marcar como COMPLETED los eventos cuyas funciones ya terminaron todas.
    for (const eventId of completedEventIds) {
      const pending = await this.prisma.eventDate.count({
        where: { eventId, endDate: { gte: now } },
      });
      if (pending === 0) {
        await this.prisma.event.updateMany({
          where: { id: eventId, status: EventStatus.PUBLISHED },
          data: { status: EventStatus.COMPLETED },
        });
      }
    }

    return { scheduled };
  }

  /**
   * Paso 2: ejecuta los payouts ya elegibles (eligibleAt vencido). Revalida que el
   * evento no se haya cancelado en el ínterin. Transfiere al organizador con reintentos.
   */
  async runEligiblePayouts(now = new Date()): Promise<{ paid: number; failed: number }> {
    const due = await this.prisma.payout.findMany({
      where: { status: PayoutStatus.SCHEDULED, eligibleAt: { lte: now } },
    });

    let paid = 0;
    let failed = 0;

    for (const payout of due) {
      const event = await this.prisma.event.findUnique({ where: { id: payout.eventId } });
      if (event?.status === EventStatus.CANCELLED) {
        await this.prisma.payout.update({
          where: { id: payout.id },
          data: { status: PayoutStatus.CANCELLED, cancelledAt: new Date() },
        });
        this.logger.warn(`Payout ${payout.id} cancelado: el evento ${payout.eventId} fue cancelado`);
        continue;
      }

      await this.prisma.payout.update({
        where: { id: payout.id },
        data: { status: PayoutStatus.PROCESSING },
      });

      // Si el organizador tiene multas pendientes (eventos cancelados), se descuentan
      // de este payout antes de transferirle nada.
      const pendingDebt = await this.pendingDebtTotal(payout.organizerId);
      const debtApplied = Prisma.Decimal.min(payout.netAmount, pendingDebt);
      const payableAmount = payout.netAmount.sub(debtApplied);

      let mpTransferId: string | null = null;
      let failureReason: string | null = null;
      let attempts = 0;
      if (payableAmount.isZero()) {
        // La deuda absorbió todo el neto: no hay nada que transferir.
        mpTransferId = `DEBT-${payout.id}`;
      } else {
        for (let i = 1; i <= MAX_PAYOUT_ATTEMPTS; i++) {
          attempts = i;
          try {
            const res = await this.gateway.payout({
              reference: payout.id,
              organizerId: payout.organizerId,
              amount: Number(payableAmount),
              currency: payout.currency,
            });
            mpTransferId = res.mpTransferId;
            break;
          } catch (err) {
            failureReason = (err as Error).message;
            this.logger.warn(`Payout ${payout.id} intento ${i} falló: ${failureReason}`);
            if (i < MAX_PAYOUT_ATTEMPTS) await this.sleep(200 * 2 ** (i - 1));
          }
        }
      }

      if (mpTransferId) {
        await this.prisma.payout.update({
          where: { id: payout.id },
          data: { status: PayoutStatus.PAID, paidAt: new Date(), mpTransferId, attempts },
        });
        if (debtApplied.gt(0)) {
          await this.settleOrganizerDebt(payout.organizerId, debtApplied);
          this.logger.log(
            `Payout ${payout.id}: se descontaron ${debtApplied} ${payout.currency} por multas pendientes`,
          );
        }
        paid += 1;
        this.logger.log(`Payout ${payout.id} PAID → organizador ${payout.organizerId}`);
      } else {
        await this.prisma.payout.update({
          where: { id: payout.id },
          data: { status: PayoutStatus.FAILED, attempts, failureReason },
        });
        failed += 1;
        this.logger.error(`Payout ${payout.id} FAILED tras ${attempts} intentos`);
      }
    }

    return { paid, failed };
  }

  /** Corre los dos pasos en orden (lo usa el scheduler y el endpoint admin). */
  async runCycle(now = new Date()) {
    const a = await this.closePastEventsAndSchedule(now);
    const b = await this.runEligiblePayouts(now);
    return { ...a, ...b };
  }

  /**
   * Si un evento se cancela cuando ya tenía payouts programados (caso raro: cancelado
   * después de realizado), se anulan: el dinero retenido financia los reembolsos.
   */
  @OnEvent(DomainEvents.EVENT_CANCELLED)
  async onEventCancelled(payload: EventCancelledPayload) {
    const res = await this.prisma.payout.updateMany({
      where: {
        eventId: payload.eventId,
        status: { in: [PayoutStatus.SCHEDULED, PayoutStatus.PROCESSING] },
      },
      data: { status: PayoutStatus.CANCELLED, cancelledAt: new Date() },
    });
    if (res.count > 0) {
      this.logger.log(`Evento ${payload.eventId} cancelado → ${res.count} payouts anulados`);
    }

    await this.registerCancellationPenalty(payload);
  }

  /**
   * Multa por cancelación: compensa la comisión que Clickpass no llega a cobrar más
   * el cargo de servicio que se le devuelve al comprador (ver refund.service). Se
   * calcula sobre los pagos ya cobrados (SUCCEEDED o ya REFUNDED) de las funciones
   * canceladas; el monto y metadata de un Payment no cambian al reembolsarse.
   */
  private async registerCancellationPenalty(payload: EventCancelledPayload) {
    const event = await this.prisma.event.findUnique({
      where: { id: payload.eventId },
      include: { dates: true },
    });
    if (!event) return;

    const payments = await this.prisma.payment.findMany({
      where: {
        eventDateId: { in: payload.eventDateIds },
        status: { in: ['SUCCEEDED', 'REFUNDED'] },
      },
    });
    if (payments.length === 0) return;

    let grossAmount = new Prisma.Decimal(0);
    let serviceFeeAmount = new Prisma.Decimal(0);
    for (const payment of payments) {
      const metadata = payment.metadata as { subtotal?: string; serviceFee?: string } | null;
      grossAmount = grossAmount.add(new Prisma.Decimal(metadata?.subtotal ?? 0));
      serviceFeeAmount = serviceFeeAmount.add(new Prisma.Decimal(metadata?.serviceFee ?? 0));
    }
    if (grossAmount.isZero() && serviceFeeAmount.isZero()) return;

    const organizer = await this.prisma.user.findUnique({
      where: { id: event.organizerId },
      select: { createdAt: true },
    });
    const earliestStart = event.dates.reduce(
      (min, d) => (d.startDate < min ? d.startDate : min),
      event.dates[0]?.startDate ?? event.createdAt,
    );
    const commissionRate = resolveCommissionRate({
      eventStart: earliestStart,
      organizerCreatedAt: organizer?.createdAt ?? event.createdAt,
      freePeriodDays: this.freePeriodDays,
      standardRate: this.standardRate,
    });

    const penaltyAmount = computeCancellationPenalty({
      grossAmount,
      serviceFeeAmount,
      commissionRate,
    });
    if (penaltyAmount.lte(0)) return;

    await this.prisma.organizerPenalty.create({
      data: {
        organizerId: event.organizerId,
        eventId: event.id,
        amount: penaltyAmount,
        currency: payments[0].currency,
      },
    });
    this.logger.log(
      `Evento ${event.id} cancelado → multa de ${penaltyAmount} ${payments[0].currency} para organizador ${event.organizerId}`,
    );
  }

  /** Suma de multas PENDING del organizador (lectura, sin mutar nada). */
  private async pendingDebtTotal(organizerId: string): Promise<Prisma.Decimal> {
    const agg = await this.prisma.organizerPenalty.aggregate({
      _sum: { amount: true },
      where: { organizerId, status: PenaltyStatus.PENDING },
    });
    return agg._sum.amount ?? new Prisma.Decimal(0);
  }

  /**
   * Descuenta del payout cualquier multa pendiente del organizador (más antigua
   * primero) hasta agotar el monto disponible o las deudas. No reduce `netAmount`
   * (queda como registro histórico de lo calculado); solo afecta lo transferido.
   */
  private async settleOrganizerDebt(
    organizerId: string,
    available: Prisma.Decimal,
  ): Promise<Prisma.Decimal> {
    const pending = await this.prisma.organizerPenalty.findMany({
      where: { organizerId, status: PenaltyStatus.PENDING },
      orderBy: { createdAt: 'asc' },
    });
    let remaining = available;
    let appliedTotal = new Prisma.Decimal(0);
    for (const penalty of pending) {
      if (remaining.lte(0)) break;
      const apply = Prisma.Decimal.min(remaining, penalty.amount);
      remaining = remaining.sub(apply);
      appliedTotal = appliedTotal.add(apply);
      const left = penalty.amount.sub(apply);
      await this.prisma.organizerPenalty.update({
        where: { id: penalty.id },
        data: {
          amount: left,
          status: left.lte(0) ? PenaltyStatus.SETTLED : PenaltyStatus.PENDING,
          settledAt: left.lte(0) ? new Date() : null,
        },
      });
    }
    return appliedTotal;
  }

  /** Liquidaciones del organizador autenticado (para su panel). */
  async findByOrganizer(organizerId: string) {
    return this.prisma.payout.findMany({
      where: { organizerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Multas del organizador autenticado (canceló eventos con entradas vendidas). */
  async findPenaltiesByOrganizer(organizerId: string) {
    return this.prisma.organizerPenalty.findMany({
      where: { organizerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Exposición de dinero retenido pendiente de liquidar (solo ADMIN). */
  async getPendingExposure() {
    const agg = await this.prisma.payout.aggregate({
      _sum: { netAmount: true },
      _count: { _all: true },
      where: { status: { in: [PayoutStatus.SCHEDULED, PayoutStatus.PROCESSING] } },
    });
    return {
      pendingNet: (agg._sum.netAmount ?? new Prisma.Decimal(0)).toString(),
      pendingCount: agg._count._all,
      currency: 'ARS',
    };
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
