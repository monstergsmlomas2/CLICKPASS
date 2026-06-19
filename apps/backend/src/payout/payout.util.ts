/**
 * Utilidades puras del módulo de liquidación al organizador (payout).
 *
 * Modelo de negocio: Clickpass retiene el dinero hasta que el evento se realiza y
 * pasa la ventana de retención (días corridos). Recién ahí liquida al organizador el
 * PRECIO BASE de las entradas vendidas menos la comisión. El 15% de cargo de servicio
 * que paga el comprador NO entra acá: es ingreso de Clickpass.
 *
 * Comisión al organizador: 0% durante el período de onboarding (primer mes desde su
 * alta), `standardRate` después.
 */
import { Prisma } from '@prisma/client';

/** Suma `days` días corridos (calendario, no hábiles) a `from`. */
export function addCalendarDays(from: Date, days: number): Date {
  const result = new Date(from.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Resuelve la tasa de comisión aplicable. Si el evento ocurre dentro del período
 * gratuito de onboarding del organizador → 0; si no → `standardRate`.
 */
export function resolveCommissionRate(params: {
  eventStart: Date;
  organizerCreatedAt: Date;
  freePeriodDays: number;
  standardRate: number;
}): number {
  const freeUntil = addCalendarDays(params.organizerCreatedAt, params.freePeriodDays);
  return params.eventStart.getTime() <= freeUntil.getTime() ? 0 : params.standardRate;
}

export interface PayoutAmounts {
  grossAmount: Prisma.Decimal;
  commissionRate: Prisma.Decimal;
  commissionAmount: Prisma.Decimal;
  netAmount: Prisma.Decimal;
}

/**
 * Calcula los montos de la liquidación a partir del precio base unitario, la cantidad
 * de entradas confirmadas y la tasa de comisión. Todo en Decimal (nunca Float), con
 * la comisión redondeada a 2 decimales.
 */
export function computePayoutAmounts(params: {
  unitBasePrice: Prisma.Decimal | string | number;
  ticketsCount: number;
  commissionRate: number;
}): PayoutAmounts {
  const grossAmount = new Prisma.Decimal(params.unitBasePrice).mul(params.ticketsCount);
  const commissionRate = new Prisma.Decimal(params.commissionRate);
  const commissionAmount = grossAmount.mul(commissionRate).toDecimalPlaces(2);
  const netAmount = grossAmount.sub(commissionAmount);
  return { grossAmount, commissionRate, commissionAmount, netAmount };
}

/**
 * Multa por cancelación del organizador: lo que Clickpass deja de ganar (comisión
 * sobre el precio base) más lo que tiene que devolverle al comprador (cargo de
 * servicio del 15%, ya que la cancelación se la devuelve completa por ser culpa
 * del organizador). Cubre exactamente la pérdida, ni más ni menos.
 */
export function computeCancellationPenalty(params: {
  grossAmount: Prisma.Decimal | string | number;
  serviceFeeAmount: Prisma.Decimal | string | number;
  commissionRate: number;
}): Prisma.Decimal {
  const gross = new Prisma.Decimal(params.grossAmount);
  const serviceFee = new Prisma.Decimal(params.serviceFeeAmount);
  const commissionAmount = gross.mul(params.commissionRate).toDecimalPlaces(2);
  return commissionAmount.add(serviceFee);
}
