/**
 * Eventos de dominio del EventBus interno (eventos de NestJS).
 * La FORMA del payload se mantiene estable para poder migrar a RabbitMQ sin
 * reescribir la lógica (sección 3 del spec): el mismo contrato viajará por la cola.
 */

export const DomainEvents = {
  TICKET_PURCHASED: 'ticket.purchased',
  EVENT_CANCELLED: 'event.cancelled',
  REFUND_REQUESTED: 'refund.requested',
  REFUND_LINK_REQUESTED: 'refund.link_requested',
  REFUND_COMPLETED: 'refund.completed',
  TICKET_LINK_REQUESTED: 'ticket.link_requested',
} as const;

export interface TicketPurchasedPayload {
  paymentId: string;
  userId: string | null; // null si compró como invitado (ver guestEmail)
  guestEmail?: string | null;
  eventDateId: string;
  ticketIds: string[];
  qrCodes: string[];
  amount: string; // Decimal serializado
  currency: string;
}

export interface EventCancelledPayload {
  eventId: string;
  eventTitle: string;
  eventDateIds: string[];
}

/** Link de confirmación de reembolso para un comprador sin cuenta (verificación por email). */
export interface RefundLinkRequestedPayload {
  paymentId: string;
  email: string;
  confirmUrl: string;
  currency: string;
}

/** Link mágico para que un comprador sin cuenta vea sus entradas (verificación por email). */
export interface TicketLinkRequestedPayload {
  email: string;
  viewUrl: string;
  ticketCount: number;
}

export interface RefundCompletedPayload {
  refundId: string;
  paymentId: string;
  userId: string | null;
  guestEmail?: string | null;
  reason: string; // EVENT_CANCELLED | USER_REQUEST
  amount: string; // monto efectivamente reembolsado (sin el 15% si fue USER_REQUEST)
  currency: string;
  bonusApplied: boolean;
  bonusAmount?: string;
}
