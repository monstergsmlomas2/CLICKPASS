/** Contrato de pasarela de pago, agnóstico del proveedor (hoy MercadoPago). */

export interface CreatePreferenceInput {
  /** Referencia externa = id de nuestro Payment. La pasarela la devuelve en el webhook. */
  externalReference: string;
  title: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  payerEmail?: string;
  /** A dónde vuelve el usuario tras pagar. */
  backUrls: { success: string; failure: string; pending: string };
  /** URL pública donde la pasarela notifica el resultado. */
  notificationUrl: string;
}

export interface CreatePreferenceResult {
  preferenceId: string;
  /** URL a la que se redirige al usuario para pagar (Checkout Pro). */
  initPoint: string;
}

export type GatewayPaymentStatus = 'approved' | 'pending' | 'rejected';

export interface GatewayPayment {
  mpPaymentId: string;
  status: GatewayPaymentStatus;
  externalReference: string;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface GatewayRefundResult {
  mpRefundId: string;
}

export interface PayoutInput {
  /** Referencia externa = id de nuestro Payout. */
  reference: string;
  /** ID del organizador en nuestro dominio (para mapear su cuenta destino). */
  organizerId: string;
  /** Monto neto a transferir (precio base menos comisión). */
  amount: number;
  currency: string;
}

export interface GatewayPayoutResult {
  mpTransferId: string;
}

export interface PaymentGateway {
  /** true si está usando credenciales reales; false si corre en modo simulado. */
  isReal(): boolean;
  createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceResult>;
  /** Consulta el estado de un pago por su id en la pasarela (usado por el webhook). */
  getPayment(mpPaymentId: string): Promise<GatewayPayment>;
  /**
   * Reembolsa un pago original (total o parcial). El dinero sale del pago del
   * organizador, no de Clickpass: Clickpass solo ejecuta la devolución.
   */
  refund(mpPaymentId: string, amount?: number): Promise<GatewayRefundResult>;
  /**
   * Liquida al organizador su parte (precio base menos comisión), una vez que el
   * evento se realizó y pasó la ventana de retención. El dinero sale de los fondos
   * retenidos por Clickpass del pago original.
   */
  payout(input: PayoutInput): Promise<GatewayPayoutResult>;
}
