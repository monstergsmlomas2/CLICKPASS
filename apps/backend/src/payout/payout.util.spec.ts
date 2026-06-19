import {
  addCalendarDays,
  resolveCommissionRate,
  computePayoutAmounts,
} from './payout.util';

describe('payout.util', () => {
  describe('addCalendarDays', () => {
    it('suma días corridos incluyendo fines de semana', () => {
      // Viernes 2026-06-19 + 5 días corridos = miércoles 2026-06-24
      const from = new Date('2026-06-19T22:00:00');
      const due = addCalendarDays(from, 5);
      expect(due.getFullYear()).toBe(2026);
      expect(due.getMonth()).toBe(5); // junio (0-index)
      expect(due.getDate()).toBe(24);
    });
  });

  describe('resolveCommissionRate', () => {
    const organizerCreatedAt = new Date('2026-01-01T00:00:00');

    it('cobra 0% si el evento cae dentro del período gratis de onboarding', () => {
      const rate = resolveCommissionRate({
        eventStart: new Date('2026-01-20T00:00:00'), // 19 días después del alta
        organizerCreatedAt,
        freePeriodDays: 30,
        standardRate: 0.05,
      });
      expect(rate).toBe(0);
    });

    it('cobra la tasa estándar si el evento cae después del período gratis', () => {
      const rate = resolveCommissionRate({
        eventStart: new Date('2026-03-01T00:00:00'), // muy después de los 30 días
        organizerCreatedAt,
        freePeriodDays: 30,
        standardRate: 0.05,
      });
      expect(rate).toBe(0.05);
    });
  });

  describe('computePayoutAmounts', () => {
    it('liquida el precio base sin comisión durante el período gratis', () => {
      // 400 entradas x $25.000 = $10.000.000, comisión 0
      const a = computePayoutAmounts({
        unitBasePrice: 25000,
        ticketsCount: 400,
        commissionRate: 0,
      });
      expect(a.grossAmount.toString()).toBe('10000000');
      expect(a.commissionAmount.toString()).toBe('0');
      expect(a.netAmount.toString()).toBe('10000000');
    });

    it('descuenta el 5% de comisión sobre el precio base (no sobre el cargo al comprador)', () => {
      // 400 entradas x $25.000 = $10.000.000 bruto, 5% = $500.000, neto $9.500.000
      const a = computePayoutAmounts({
        unitBasePrice: 25000,
        ticketsCount: 400,
        commissionRate: 0.05,
      });
      expect(a.grossAmount.toString()).toBe('10000000');
      expect(a.commissionAmount.toString()).toBe('500000');
      expect(a.netAmount.toString()).toBe('9500000');
    });

    it('redondea la comisión a 2 decimales', () => {
      const a = computePayoutAmounts({
        unitBasePrice: '333.33',
        ticketsCount: 3,
        commissionRate: 0.05,
      });
      // bruto 999.99 ; 5% = 49.9995 → 50.00 ; neto 949.99
      expect(a.grossAmount.toString()).toBe('999.99');
      expect(a.commissionAmount.toString()).toBe('50');
      expect(a.netAmount.toString()).toBe('949.99');
    });
  });
});
