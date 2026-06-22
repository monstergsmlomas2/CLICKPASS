import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma/prisma.service';
import { DomainEvents, TicketPurchasedPayload } from '../common/events/domain-events';
import { CheckoutDto } from './dto/checkout.dto';
import {
  PAYMENT_GATEWAY,
  PaymentGateway,
  GatewayPaymentStatus,
} from './gateway/payment-gateway';
import { SimulatedGateway } from './gateway/simulated.gateway';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emitter: EventEmitter2,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  /**
   * Crea el pago (PENDING) y la preference de Checkout Pro; devuelve la URL de pago.
   * Admite comprador logueado (`user`) o invitado sin cuenta (`dto.guestEmail`).
   */
  async createCheckout(
    user: { sub: string; email: string } | null,
    dto: CheckoutDto,
  ) {
    if (!user && (!dto.guestEmail || !dto.guestName)) {
      throw new BadRequestException('Para pagar sin cuenta indicá nombre y email de contacto');
    }
    const payerEmail = user?.email ?? dto.guestEmail!;

    const eventDate = await this.prisma.eventDate.findUnique({
      where: { id: dto.eventDateId },
    });
    if (!eventDate) throw new NotFoundException('Fecha de evento no encontrada');

    // Validar la reserva temporal vigente: dueño por userId (cuenta) o guestEmail (invitado).
    const lock = await this.prisma.reservationLock.findUnique({
      where: { idempotencyKey: dto.reservationKey },
    });
    const ownsLock = user
      ? lock?.userId === user.sub
      : !lock?.userId && lock?.guestEmail === dto.guestEmail;
    if (!lock || !ownsLock || lock.eventDateId !== dto.eventDateId) {
      throw new NotFoundException('Reserva no encontrada');
    }
    if (lock.expiresAt < new Date()) {
      throw new BadRequestException('La reserva expiró, volvé a reservar');
    }
    if (lock.quantity !== dto.quantity) {
      throw new BadRequestException('La cantidad no coincide con la reserva');
    }

    // Tomar los tickets RESERVED de esta reserva aún sin pago asociado.
    const tickets = await this.prisma.ticket.findMany({
      where: {
        eventDateId: dto.eventDateId,
        ...(user ? { userId: user.sub } : { userId: null, attendeeEmail: dto.guestEmail }),
        status: 'RESERVED',
        purchaseId: null,
      },
      orderBy: { reservedAt: 'asc' },
      take: dto.quantity,
    });
    if (tickets.length < dto.quantity) {
      throw new ConflictException('No hay tickets reservados suficientes para pagar');
    }

    // Subtotal (lo que publicó el organizador) + 15% de cargo por servicio a cargo del comprador.
    // Las consumiciones elegidas al reservar (lock.items) llevan el mismo 15%.
    const SERVICE_FEE_RATE = 0.15;
    const subtotal = new Prisma.Decimal(eventDate.price).mul(dto.quantity);
    const serviceFee = subtotal.mul(SERVICE_FEE_RATE);

    const lockItems =
      (lock.items as { productId: string; name: string; unitPrice: string; quantity: number }[] | null) ?? [];
    const addOnsSubtotal = lockItems.reduce(
      (acc, item) => acc.add(new Prisma.Decimal(item.unitPrice).mul(item.quantity)),
      new Prisma.Decimal(0),
    );
    const addOnsServiceFee = addOnsSubtotal.mul(SERVICE_FEE_RATE);
    const addOnsAmount = addOnsSubtotal.add(addOnsServiceFee);

    const amount = subtotal.add(serviceFee).add(addOnsAmount);

    const payment = await this.prisma.payment.create({
      data: {
        userId: user?.sub ?? null,
        guestEmail: user ? null : dto.guestEmail,
        guestName: user ? null : dto.guestName,
        guestPhone: user ? null : dto.guestPhone,
        eventDateId: dto.eventDateId,
        reservationKey: dto.reservationKey,
        amount,
        currency: eventDate.currency,
        ticketsCount: dto.quantity,
        items: lockItems.length > 0 ? (lockItems as unknown as Prisma.InputJsonValue) : undefined,
        addOnsAmount,
        status: 'PENDING',
        metadata: {
          subtotal: subtotal.toString(),
          serviceFeeRate: SERVICE_FEE_RATE,
          serviceFee: serviceFee.toString(),
          addOnsSubtotal: addOnsSubtotal.toString(),
          addOnsServiceFee: addOnsServiceFee.toString(),
        },
      },
    });

    // Vincular los tickets a este pago.
    await this.prisma.ticket.updateMany({
      where: { id: { in: tickets.map((t) => t.id) } },
      data: { purchaseId: payment.id },
    });

    // Evento gratuito (reserva): no hay nada que cobrar, se confirma directo sin pasar por la pasarela.
    if (amount.isZero()) {
      await this.confirm(payment.id, payment.reservationKey, `FREE-${payment.id}`);
      const confirmedTickets = await this.prisma.ticket.findMany({
        where: { purchaseId: payment.id },
        select: { id: true, qrCode: true },
      });
      const evt: TicketPurchasedPayload = {
        paymentId: payment.id,
        userId: user?.sub ?? null,
        guestEmail: payment.guestEmail,
        eventDateId: dto.eventDateId,
        ticketIds: confirmedTickets.map((t) => t.id),
        qrCodes: confirmedTickets.map((t) => t.qrCode),
        amount: amount.toString(),
        currency: eventDate.currency,
      };
      this.emitter.emit(DomainEvents.TICKET_PURCHASED, evt);

      return {
        paymentId: payment.id,
        status: 'SUCCEEDED',
        amount: amount.toString(),
        currency: eventDate.currency,
        initPoint: null,
        simulated: !this.gateway.isReal(),
      };
    }

    const backendUrl = this.config.get<string>('BACKEND_URL', 'http://localhost:3001');
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');

    const pref = await this.gateway.createPreference({
      externalReference: payment.id,
      title: lockItems.length > 0 ? 'Entradas + consumiciones Clickpass' : 'Entradas Clickpass',
      quantity: 1,
      unitPrice: Number(amount),
      currency: eventDate.currency,
      payerEmail,
      backUrls: {
        success: `${frontendUrl}/checkout/success`,
        failure: `${frontendUrl}/checkout/failure`,
        pending: `${frontendUrl}/checkout/pending`,
      },
      notificationUrl: `${backendUrl}/payments/webhook`,
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { mpPreferenceId: pref.preferenceId },
    });

    return {
      paymentId: payment.id,
      status: 'PENDING',
      amount: amount.toString(),
      currency: eventDate.currency,
      initPoint: pref.initPoint,
      simulated: !this.gateway.isReal(),
    };
  }

  /**
   * Procesa la notificación de la pasarela (webhook). Idempotente: si el pago ya
   * fue confirmado, no hace nada. Aprobado → tickets CONFIRMED; rechazado → libera cupo.
   */
  async processWebhook(mpPaymentId: string) {
    const gp = await this.gateway.getPayment(mpPaymentId);
    const payment = await this.prisma.payment.findUnique({
      where: { id: gp.externalReference },
    });
    if (!payment) {
      this.logger.warn(`Webhook: Payment ${gp.externalReference} no encontrado`);
      return { ok: true };
    }
    if (payment.status === 'SUCCEEDED') return { ok: true, alreadyProcessed: true };

    if (gp.status === 'approved') {
      await this.confirm(payment.id, payment.reservationKey, mpPaymentId);
      this.logger.log(`Pago ${payment.id} aprobado → tickets CONFIRMED`);

      // Publicar TicketPurchased en el EventBus interno → notificación con QR.
      const tickets = await this.prisma.ticket.findMany({
        where: { purchaseId: payment.id },
        select: { id: true, qrCode: true },
      });
      const evt: TicketPurchasedPayload = {
        paymentId: payment.id,
        userId: payment.userId,
        guestEmail: payment.guestEmail,
        eventDateId: payment.eventDateId,
        ticketIds: tickets.map((t) => t.id),
        qrCodes: tickets.map((t) => t.qrCode),
        amount: payment.amount.toString(),
        currency: payment.currency,
      };
      this.emitter.emit(DomainEvents.TICKET_PURCHASED, evt);

      return { ok: true, status: 'SUCCEEDED' };
    }

    if (gp.status === 'rejected') {
      await this.releaseRejected(
        payment.id,
        payment.eventDateId,
        payment.ticketsCount,
        payment.reservationKey,
        payment.items as { productId: string; quantity: number }[] | null,
      );
      this.logger.log(`Pago ${payment.id} rechazado → cupo liberado`);
      return { ok: true, status: 'FAILED' };
    }

    return { ok: true, status: 'PENDING' };
  }

  private async confirm(paymentId: string, reservationKey: string, mpPaymentId: string) {
    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'SUCCEEDED', mpPaymentId, completedAt: new Date() },
      }),
      this.prisma.ticket.updateMany({
        where: { purchaseId: paymentId, status: 'RESERVED' },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      }),
      this.prisma.reservationLock.deleteMany({ where: { idempotencyKey: reservationKey } }),
    ]);
  }

  private async releaseRejected(
    paymentId: string,
    eventDateId: string,
    ticketsCount: number,
    reservationKey: string,
    items: { productId: string; quantity: number }[] | null,
  ) {
    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'FAILED' },
      }),
      this.prisma.ticket.deleteMany({ where: { purchaseId: paymentId, status: 'RESERVED' } }),
      // Devolver el cupo y reactivar la fecha.
      this.prisma.$executeRaw`
        UPDATE "clickpass_event"."EventDate"
        SET "ticketsSold" = GREATEST("ticketsSold" - ${ticketsCount}, 0),
            "status" = 'ACTIVE'::"clickpass_event"."DateStatus",
            "version" = "version" + 1
        WHERE "id" = ${eventDateId}`,
      this.prisma.reservationLock.deleteMany({ where: { idempotencyKey: reservationKey } }),
      // Devolver el stock de las consumiciones elegidas, si había.
      ...(items ?? []).map((item) =>
        this.prisma.$executeRaw`
          UPDATE "clickpass_event"."Product"
          SET "sold" = GREATEST("sold" - ${item.quantity}, 0),
              "version" = "version" + 1
          WHERE "id" = ${item.productId}`,
      ),
    ]);
  }

  /** Solo desarrollo (modo simulado): emula la respuesta de MercadoPago. */
  async simulate(reference: string, status: GatewayPaymentStatus) {
    if (this.gateway.isReal()) {
      throw new BadRequestException('La simulación no está disponible en modo real');
    }
    const sim = this.gateway as unknown as SimulatedGateway;
    const gp = sim.simulatePayment(reference, status);
    return this.processWebhook(gp.mpPaymentId);
  }

  async findByUser(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
