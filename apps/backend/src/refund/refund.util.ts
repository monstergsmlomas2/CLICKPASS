/**
 * Utilidades de la garantía "48h hábiles o bono".
 * El plazo cuenta en horas hábiles (lun–vie); se excluyen sábados y domingos.
 */

/** Suma `businessHours` horas hábiles a `from`, saltando fines de semana. */
export function addBusinessHours(from: Date, businessHours: number): Date {
  const result = new Date(from.getTime());
  let remaining = businessHours;
  while (remaining > 0) {
    result.setHours(result.getHours() + 1);
    const day = result.getDay(); // 0 = domingo, 6 = sábado
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }
  return result;
}

export type BonusAttribution = 'CLICKPASS' | 'PAYMENT_NETWORK' | 'NONE';

export interface BonusDecision {
  applies: boolean;
  amount: number;
  reason: string | null;
}

/**
 * Decide el bono compensatorio. Reglas (sección 6.2 / 10.1):
 * - Solo aplica si hubo incumplimiento del SLA Y la causa es atribuible a Clickpass.
 * - NO aplica si la demora vino de la red de pagos (Stripe/MercadoPago/banco/disputa).
 * - El bono es un crédito acotado por `cap` (nunca supera el cap por transacción).
 */
export function decideBonus(params: {
  slaDueAt: Date;
  completedAt: Date;
  attribution: BonusAttribution;
  amount: number;
  cap: number;
}): BonusDecision {
  const breached = params.completedAt.getTime() > params.slaDueAt.getTime();
  if (!breached || params.attribution !== 'CLICKPASS') {
    return { applies: false, amount: 0, reason: null };
  }
  // "48h o el doble", acotado: el bono nunca supera el cap por transacción.
  const amount = Math.min(params.amount, params.cap);
  return { applies: true, amount, reason: 'SLA_BREACH_CLICKPASS' };
}
