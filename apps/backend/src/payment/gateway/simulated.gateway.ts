import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  PaymentGateway,
  CreatePreferenceInput,
  CreatePreferenceResult,
  GatewayPayment,
  GatewayPaymentStatus,
  GatewayRefundResult,
  PayoutInput,
  GatewayPayoutResult,
} from './payment-gateway';

/**
 * Pasarela SIMULADA: se usa cuando no hay credenciales de MercadoPago.
 * No llama a ningún servicio externo. Permite probar el flujo completo de pago
 * (incluido el webhook) de forma local. Al cargar las credenciales TEST-..., el
 * módulo cambia a MercadoPagoGateway sin tocar el resto del código.
 */
export class SimulatedGateway implements PaymentGateway {
  private readonly logger = new Logger(SimulatedGateway.name);
  /** mpPaymentId -> datos del pago simulado. */
  private readonly payments = new Map<string, GatewayPayment>();

  constructor(private readonly backendUrl: string) {}

  isReal(): boolean {
    return false;
  }

  async createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceResult> {
    const preferenceId = `sim-pref-${randomUUID()}`;
    // initPoint apunta a un endpoint local de simulación en lugar de la pantalla de MP.
    const initPoint = `${this.backendUrl}/payments/_simulate?ref=${encodeURIComponent(
      input.externalReference,
    )}`;
    this.logger.log(`[SIMULADO] preference creada para ref=${input.externalReference}`);
    return { preferenceId, initPoint };
  }

  async getPayment(mpPaymentId: string): Promise<GatewayPayment> {
    const found = this.payments.get(mpPaymentId);
    if (!found) throw new Error(`[SIMULADO] pago ${mpPaymentId} no encontrado`);
    return found;
  }

  async refund(mpPaymentId: string, _amount?: number): Promise<GatewayRefundResult> {
    this.logger.log(`[SIMULADO] reembolso del pago ${mpPaymentId}`);
    return { mpRefundId: `sim-ref-${randomUUID()}` };
  }

  async payout(input: PayoutInput): Promise<GatewayPayoutResult> {
    this.logger.log(
      `[SIMULADO] payout a organizador ${input.organizerId}: ${input.amount} ${input.currency} (ref=${input.reference})`,
    );
    return { mpTransferId: `sim-payout-${randomUUID()}` };
  }

  /** Genera un pago simulado con el estado indicado (lo usa el endpoint de simulación). */
  simulatePayment(externalReference: string, status: GatewayPaymentStatus): GatewayPayment {
    const mpPaymentId = `sim-pay-${randomUUID()}`;
    const payment: GatewayPayment = { mpPaymentId, status, externalReference };
    this.payments.set(mpPaymentId, payment);
    return payment;
  }
}
