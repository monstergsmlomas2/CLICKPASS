'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Ticket as TicketIcon } from 'lucide-react';
import { api } from '../../../lib/api';

export default function TicketsLookupPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ ok: boolean; message: string }>('/tickets/lookup', {
        method: 'POST',
        body: { email: email.trim() },
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
        <TicketIcon size={14} /> Mis entradas
      </span>
      <h1 className="mt-1 font-display text-3xl font-bold text-fg">Ver mis entradas</h1>
      <p className="mt-2 text-sm text-muted">
        ¿Compraste sin cuenta? Ingresá el email que usaste y te enviamos un link para ver tus
        entradas con su QR, sin necesidad de registrarte.
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
          {error && (
            <p className="rounded-xl border border-violet/30 bg-violet/10 px-3 py-2 text-sm font-medium text-cyan">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-neon w-full text-base disabled:opacity-50">
            {loading ? 'Enviando…' : 'Enviarme el link'}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-xs text-muted">
        ¿Tenés cuenta?{' '}
        <Link href="/auth/login" className="font-medium text-lime hover:underline">
          Ingresá
        </Link>{' '}
        para verlas en tu billetera.
      </p>
    </div>
  );
}
