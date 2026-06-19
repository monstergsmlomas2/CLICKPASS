import { Logger } from '@nestjs/common';
import { MercadoPagoConfig, Preference, Payment, PaymentRefund } from 'mercadopago';
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

/** Implementación real con el SDK de MercadoPago (Checkout Pro). */
export class MercadoPagoGateway implements PaymentGateway {
  private readonly logger = new Logger(MercadoPagoGateway.name);
  private readonly client: MercadoPagoConfig;

  constructor(accessToken: string) {
    this.client = new MercadoPagoConfig({ accessToken });
  }

  isReal(): boolean {
    return true;
  }

  async createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceResult> {
    const pref = await new Preference(this.client).create({
      body: {
        items: [
          {
            id: input.externalReference,
            title: input.title,
            quantity: input.quantity,
            unit_price: input.unitPrice,
            currency_id: input.currency,
          },
        ],
        external_reference: input.externalReference,
        back_urls: input.backUrls,
        auto_return: 'approved',
        notification_url: input.notificationUrl,
        payer: input.payerEmail ? { email: input.payerEmail } : undefined,
      },
    });

    if (!pref.id || !pref.init_point) {
      throw new Error('MercadoPago no devolvió preferenceId / init_point');
    }
    return { preferenceId: pref.id, initPoint: pref.init_point };
  }

  async getPayment(mpPaymentId: string): Promise<GatewayPayment> {
    const p = await new Payment(this.client).get({ id: mpPaymentId });
    return {
      mpPaymentId: String(p.id),
      status: this.mapStatus(p.status),
      externalReference: p.external_reference ?? '',
    };
  }

  async refund(mpPaymentId: string, amount?: number): Promise<GatewayRefundResult> {
    const refund = await new PaymentRefund(this.client).create({
      payment_id: mpPaymentId,
      body: amount != null ? { amount } : {},
    });
    if (!refund.id) throw new Error('MercadoPago no devolvió id de reembolso');
    return { mpRefundId: String(refund.id) };
  }

  async payout(_input: PayoutInput): Promise<GatewayPayoutResult> {
    // La transferencia real al organizador requiere split de pagos / Marketplace de
    // MercadoPago (application_fee + cuenta vinculada del organizador), que todavía no
    // está configurado (ver pendientes de go-to-market). Hasta entonces, no liquidar
    // por la vía real para no mover dinero sin la infraestructura de split.
    throw new Error(
      'Payout real no implementado: falta configurar split/Marketplace de MercadoPago',
    );
  }

  private mapStatus(status?: string): GatewayPaymentStatus {
    if (status === 'approved') return 'approved';
    if (status === 'rejected' || status === 'cancelled') return 'rejected';
    return 'pending';
  }
}
