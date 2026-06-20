import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma/prisma.service';
import { EMAIL_GATEWAY, EmailGateway } from './email/email-gateway';
import {
  DomainEvents,
  TicketPurchasedPayload,
  RefundCompletedPayload,
  RefundLinkRequestedPayload,
} from '../common/events/domain-events';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(EMAIL_GATEWAY) private readonly email: EmailGateway,
  ) {}

  /**
   * Persiste la notificación y la envía por email (o la simula). Idempotencia best-effort.
   * Acepta destinatario con cuenta (userId, se busca el email) o invitado (recipientEmail directo).
   */
  async notify(params: {
    userId?: string | null;
    recipientEmail?: string | null;
    channel: string;
    subject: string;
    html: string;
    metadata?: Record<string, unknown>;
  }) {
    let recipient = params.recipientEmail ?? null;
    if (!recipient && params.userId) {
      const user = await this.prisma.user.findUnique({ where: { id: params.userId } });
      recipient = user?.email ?? null;
    }

    const notif = await this.prisma.notification.create({
      data: {
        userId: params.userId ?? null,
        recipientEmail: params.recipientEmail ?? null,
        type: 'EMAIL',
        channel: params.channel,
        subject: params.subject,
        content: params.html,
        metadata: params.metadata as object,
        status: 'PENDING',
      },
    });

    if (!recipient) {
      await this.prisma.notification.update({
        where: { id: notif.id },
        data: { status: 'FAILED' },
      });
      this.logger.warn(`Notificación ${notif.id}: sin destinatario`);
      return notif;
    }

    try {
      await this.email.send({ to: recipient, subject: params.subject, html: params.html });
      return this.prisma.notification.update({
        where: { id: notif.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } catch (err) {
      this.logger.error(`Fallo enviando notificación ${notif.id}: ${(err as Error).message}`);
      return this.prisma.notification.update({
        where: { id: notif.id },
        data: { status: 'FAILED' },
      });
    }
  }

  // ===== Listeners del EventBus interno =====

  @OnEvent(DomainEvents.TICKET_PURCHASED)
  async onTicketPurchased(payload: TicketPurchasedPayload) {
    const qrList = payload.qrCodes
      .map((q, i) => `<li>Entrada ${i + 1}: <code>${q}</code></li>`)
      .join('');
    // Para compradores sin cuenta: guardamos el número de compra + link de autogestión,
    // porque no tienen dashboard donde verlo (ver pedido de reembolso por email).
    let guestBlock = '';
    if (!payload.userId && payload.guestEmail) {
      const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
      guestBlock = `
        <hr/>
        <p>Tu número de compra es <code>${payload.paymentId}</code>. Guardalo.</p>
        <p>¿Necesitás gestionar un reembolso? <a href="${frontendUrl}/refunds/request">Hacelo acá</a> con tu email y este número (sujeto a la política del evento).</p>`;
    }
    await this.notify({
      userId: payload.userId,
      recipientEmail: payload.guestEmail,
      channel: 'TICKET_CONFIRMED',
      subject: '🎟️ Tu compra en Clickpass está confirmada',
      html: `<h2>Click. Pass. Listo.</h2>
        <p>Tu pago de ${payload.amount} ${payload.currency} fue confirmado.</p>
        <p>Estas son tus entradas (presentá el QR en el evento):</p>
        <ul>${qrList}</ul>${guestBlock}`,
      metadata: { paymentId: payload.paymentId, ticketIds: payload.ticketIds },
    });
  }

  @OnEvent(DomainEvents.REFUND_LINK_REQUESTED)
  async onRefundLinkRequested(payload: RefundLinkRequestedPayload) {
    await this.notify({
      recipientEmail: payload.email,
      channel: 'REFUND_LINK',
      subject: '🔒 Confirmá tu pedido de reembolso en Clickpass',
      html: `<h2>Confirmá tu reembolso</h2>
        <p>Recibimos un pedido de reembolso para tu compra. Si fuiste vos, confirmá con este botón:</p>
        <p><a href="${payload.confirmUrl}" style="display:inline-block;padding:12px 20px;background:#10E89C;color:#0b0b14;border-radius:10px;text-decoration:none;font-weight:bold;">Confirmar reembolso</a></p>
        <p>El link vence en 30 minutos. Recordá que el costo por servicio (15%) no se reintegra en cancelaciones pedidas por vos.</p>
        <p>Si no pediste esto, ignorá este email: no se hará ningún reembolso.</p>`,
      metadata: { paymentId: payload.paymentId },
    });
  }

  @OnEvent(DomainEvents.REFUND_COMPLETED)
  async onRefundCompleted(payload: RefundCompletedPayload) {
    const bonusLine = payload.bonusApplied
      ? `<p>Además, por la demora te acreditamos un bono de ${payload.bonusAmount} ${payload.currency} para tu próxima compra.</p>`
      : '';
    const feeNote =
      payload.reason === 'USER_REQUEST'
        ? '<p>El cargo por servicio (15%) no es reembolsable cuando la cancelación la pedís vos; por eso el monto no incluye ese cargo.</p>'
        : '';
    await this.notify({
      userId: payload.userId,
      recipientEmail: payload.guestEmail,
      channel: 'REFUND_COMPLETED',
      subject: '💸 Tu reembolso fue procesado',
      html: `<h2>Reembolso completado</h2>
        <p>Te devolvimos ${payload.amount} ${payload.currency}.</p>
        ${feeNote}
        ${bonusLine}`,
      metadata: { refundId: payload.refundId, paymentId: payload.paymentId },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
