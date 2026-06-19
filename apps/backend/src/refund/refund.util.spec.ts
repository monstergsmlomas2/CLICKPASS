import { addBusinessHours, decideBonus } from './refund.util';

describe('refund.util', () => {
  describe('addBusinessHours', () => {
    it('suma horas dentro de la misma semana', () => {
      // Lunes 2026-06-15 09:00 + 6h = mismo lunes 15:00
      const from = new Date('2026-06-15T09:00:00');
      const due = addBusinessHours(from, 6);
      expect(due.getDate()).toBe(15);
      expect(due.getHours()).toBe(15);
    });

    it('salta el fin de semana', () => {
      // Viernes 2026-06-19 20:00 + 48h hábiles → debe caer la semana siguiente (no sáb/dom)
      const from = new Date('2026-06-19T20:00:00');
      const due = addBusinessHours(from, 48);
      expect(due.getDay()).not.toBe(0); // no domingo
      expect(due.getDay()).not.toBe(6); // no sábado
      expect(due.getTime()).toBeGreaterThan(from.getTime());
    });
  });

  describe('decideBonus', () => {
    const base = {
      slaDueAt: new Date('2026-06-17T00:00:00'),
      amount: 30000,
      cap: 10000,
    };

    it('NO aplica si se cumplió dentro del SLA', () => {
      const d = decideBonus({
        ...base,
        completedAt: new Date('2026-06-16T00:00:00'),
        attribution: 'NONE',
      });
      expect(d.applies).toBe(false);
    });

    it('NO aplica si la demora fue de la red de pagos', () => {
      const d = decideBonus({
        ...base,
        completedAt: new Date('2026-06-20T00:00:00'), // vencido
        attribution: 'PAYMENT_NETWORK',
      });
      expect(d.applies).toBe(false);
    });

    it('aplica y respeta el cap si la demora es atribuible a Clickpass', () => {
      const d = decideBonus({
        ...base,
        completedAt: new Date('2026-06-20T00:00:00'), // vencido
        attribution: 'CLICKPASS',
      });
      expect(d.applies).toBe(true);
      expect(d.amount).toBe(10000); // cap, no 30000
      expect(d.reason).toBe('SLA_BREACH_CLICKPASS');
    });
  });
});
