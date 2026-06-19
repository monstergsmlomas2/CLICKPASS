import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaymentGateway, PAYMENT_GATEWAY } from '../payment/gateway/payment-gateway';
import { addBusinessHours, decideBonus, BonusAttribution } from './refund.util';
import {
  DomainEvents,
  EventCancelledPayload,
  RefundCompletedPayload,
} from '../common/events/domain-events';
import { Prisma } from '@prisma/client';
import type { Payment } from '@prisma/client';

const MAX_REFUND_ATTEMPTS = 3;

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emitter: EventEmitter2,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  /**
   * Cancelación del organizador → reembolso a todos los pagos confirmados del evento.
   * Es la disposición del organizador; el dinero del precio sale del pago original.
   */
  @OnEvent(DomainEvents.EVENT_CANCELLED)
  async onEventCancelled(payload: EventCancelledPayload) {
    const payments = await this.prisma.payment.findMany({
      where: { eventDateId: { in: payload.eventDateIds }, status: 'SUCCEEDED' },
    });
    this.logger.log(
      `Evento ${payload.eventId} cancelado → ${payments.length} pagos a reembolsar`,
    );
    for (const payment of payments) {
      await this.processPaymentRefund(payment, payload.eventId, 'EVENT_CANCELLED');
    }
  }

  /**
   * Reembolso voluntario solicitado por el usuario. Solo procede si la política del
   * organizador lo permite (FLEXIBLE dentro de plazo). Clickpass no reembolsa por
   * iniciativa propia: respeta la disposición del organizador.
   */
  async requestUserRefund(user: { sub: string }, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.userId !== user.sub) {
      throw new NotFoundException('Pago no encontrado');
    }
    if (payment.status !== 'SUCCEEDED') {
      throw new BadRequestException('El pago no está en un estado reembolsable');
    }

    const eventDate = await this.prisma.eventDate.findUnique({
      where: { id: payment.eventDateId },
    });
    if (!eventDate) throw new NotFoundException('Fecha de evento no encontrada');
    const event = await this.prisma.event.findUnique({ where: { id: eventDate.eventId } });
    if (!event) throw new NotFoundException('Evento no encontrado');

    switch (event.refundPolicy) {
      case 'NO_REFUND':
        throw new ForbiddenException('El organizador no acepta reembolsos voluntarios');
      case 'FLEXIBLE': {
        const cutoff = new Date(eventDate.startDate.getTime() - 24 * 3600 * 1000);
        if (new Date() > cutoff) {
          throw new BadRequestException('Fuera del plazo de reembolso (hasta 24h antes)');
        }
        break;
      }
      case 'STANDARD':
      default:
        throw new ForbiddenException(
          'Con esta política solo se reembolsa si el evento se cancela',
        );
    }

    return this.processPaymentRefund(payment, event.id, 'USER_REQUEST');
  }

  /**
   * Calcula cuánto se reembolsa según la causa. Si cancela el organizador, es su
   * incumplimiento → se devuelve el 100% (incluido el cargo de servicio). Si es el
   * comprador quien se arrepiente, conserva el costo administrativo: solo se
   * devuelve el subtotal (precio base), nunca el 15% de cargo por servicio.
   */
  private refundableAmount(payment: Payment, reason: string): Prisma.Decimal {
    if (reason !== 'USER_REQUEST') return payment.amount;
    const metadata = payment.metadata as { subtotal?: string } | null;
    if (!metadata?.subtotal) return payment.amount;
    return new Prisma.Decimal(metadata.subtotal);
  }

  private async processPaymentRefund(payment: Payment, eventId: string, reason: string) {
    const slaHours = Number(this.config.get<string>('REFUND_SLA_HOURS', '48'));
    const cap = Number(this.config.get<string>('REFUND_BONUS_CAP', '10000'));
    const requestedAt = new Date();
    const slaDueAt = addBusinessHours(requestedAt, slaHours);
    const refundAmount = this.refundableAmount(payment, reason);

    const refund = await this.prisma.refund.create({
      data: {
        paymentId: payment.id,
        userId: payment.userId,
        guestEmail: payment.guestEmail,
        eventId,
        amount: refundAmount,
        currency: payment.currency,
        reason,
        status: 'PROCESSING',
        requestedAt,
        slaDueAt,
      },
    });
    await this.prisma.refundAudit.create({
      data: {
        refundId: refund.id,
        eventId,
        userId: payment.userId,
        amount: refundAmount,
        status: 'PROCESSING',
      },
    });

    // Reembolso del pago original con reintentos + backoff exponencial.
    let mpRefundId: string | null = null;
    let failureReason: string | null = null;
    let attempts = 0;
    for (let i = 1; i <= MAX_REFUND_ATTEMPTS; i++) {
      attempts = i;
      try {
        if (!payment.mpPaymentId) throw new Error('Pago sin mpPaymentId');
        const res = await this.gateway.refund(payment.mpPaymentId, Number(refundAmount));
        mpRefundId = res.mpRefundId;
        break;
      } catch (err) {
        failureReason = (err as Error).message;
        this.logger.warn(`Refund ${refund.id} intento ${i} falló: ${failureReason}`);
        if (i < MAX_REFUND_ATTEMPTS) await this.sleep(200 * 2 ** (i - 1));
      }
    }

    if (!mpRefundId) {
      // Falla de la red de pagos → NO atribuible a Clickpass → sin bono.
      await this.prisma.refund.update({
        where: { id: refund.id },
        data: { status: 'FAILED', attempts, failureReason },
      });
      await this.prisma.refundAudit.updateMany({
        where: { refundId: refund.id },
        data: { status: 'FAILED' },
      });
      this.logger.error(`Refund ${refund.id} FAILED tras ${attempts} intentos`);
      return refund;
    }

    const completedAt = new Date();
    // Si se completó pasado el SLA, la demora fue interna (atribuible a Clickpass).
    const attribution: BonusAttribution =
      completedAt.getTime() > slaDueAt.getTime() ? 'CLICKPASS' : 'NONE';
    const bonus = decideBonus({
      slaDueAt,
      completedAt,
      attribution,
      amount: Number(refundAmount),
      cap,
    });

    await this.prisma.$transaction([
      this.prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: 'COMPLETED',
          completedAt,
          mpRefundId,
          attempts,
          bonusApplied: bonus.applies,
          bonusAmount: bonus.applies ? new Prisma.Decimal(bonus.amount) : null,
          bonusReason: bonus.reason,
        },
      }),
      this.prisma.ticket.updateMany({
        where: { purchaseId: payment.id, status: 'CONFIRMED' },
        data: { status: 'REFUNDED' },
      }),
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED' },
      }),
      this.prisma.refundAudit.updateMany({
        where: { refundId: refund.id },
        data: { status: 'COMPLETED', completedAt, notifiedAt: new Date() },
      }),
    ]);

    const payload: RefundCompletedPayload = {
      refundId: refund.id,
      paymentId: payment.id,
      userId: payment.userId,
      guestEmail: payment.guestEmail,
      reason,
      amount: refundAmount.toString(),
      currency: payment.currency,
      bonusApplied: bonus.applies,
      bonusAmount: bonus.applies ? String(bonus.amount) : undefined,
    };
    this.emitter.emit(DomainEvents.REFUND_COMPLETED, payload);
    this.logger.log(`Refund ${refund.id} COMPLETED${bonus.applies ? ' (con bono)' : ''}`);
    return refund;
  }

  async findByUser(userId: string) {
    return this.prisma.refund.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Métrica de exposición acumulada de bonos por SLA (alerta de riesgo financiero). */
  async getBonusExposure() {
    const agg = await this.prisma.refund.aggregate({
      _sum: { bonusAmount: true },
      _count: { _all: true },
      where: { bonusApplied: true },
    });
    return {
      totalBonusExposure: (agg._sum.bonusAmount ?? new Prisma.Decimal(0)).toString(),
      bonusCount: agg._count._all,
      currency: 'ARS',
    };
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
