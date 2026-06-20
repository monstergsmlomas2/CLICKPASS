'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api } from '../../../lib/api';

export default function RequestGuestRefundPage() {
  const [form, setForm] = useState({ paymentId: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ ok: boolean; message: string }>('/refunds/request-guest', {
        method: 'POST',
        body: { paymentId: form.paymentId.trim(), email: form.email.trim() },
      });
      setDone(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar el pedido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-emerald">
        <ShieldCheck size={14} /> Reembolsos
      </span>
      <h1 className="mt-1 font-display text-3xl font-bold text-fg">Pedir un reembolso</h1>
      <p className="mt-2 text-sm text-muted">
        Compraste sin cuenta? Ingresá tu email y el número de compra (está en el email de
        confirmación). Te enviaremos un link para confirmar el reembolso.
      </p>

      {done ? (
        <div className="glass mt-8 p-6 text-center animate-rise-in">
          <p className="text-sm text-fg">{done}</p>
          <p className="mt-3 text-xs text-muted">Revisá tu bandeja de entrada (y el spam).</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          <input
            type="email"
            required
            placeholder="Tu email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="field"
          />
          <input
            type="text"
            required
            placeholder="Número de compra"
            value={form.paymentId}
            onChange={(e) => setForm({ ...form, paymentId: e.target.value })}
            className="field"
          />
          {error && (
            <p className="rounded-xl border border-violet/30 bg-violet/10 px-3 py-2 text-sm font-medium text-cyan">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-neon w-full text-base disabled:opacity-50">
            {loading ? 'Enviando…' : 'Enviar link de reembolso'}
          </button>
          <p className="text-center text-xs text-muted">
            El costo por servicio (15%) no se reintegra en cancelaciones pedidas por vos.
          </p>
        </form>
      )}
    </div>
  );
}
