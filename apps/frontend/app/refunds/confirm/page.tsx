'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { api } from '../../../lib/api';
import { formatMoney } from '../../../lib/format';

function ConfirmInner() {
  const token = useSearchParams().get('token') ?? '';
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ amount: string; currency: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!token) {
      setError('El link no es válido. Pedí uno nuevo.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ ok: boolean; amount: string; currency: string }>(
        '/refunds/confirm-guest',
        { method: 'POST', body: { token } },
      );
      setResult({ amount: res.amount, currency: res.currency });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar el reembolso');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-emerald">
        <ShieldCheck size={14} /> Reembolsos
      </span>
      <h1 className="mt-1 font-display text-3xl font-bold text-fg">Confirmar reembolso</h1>

      {result ? (
        <div className="glass mt-8 p-6 text-center animate-rise-in">
          <h2 className="font-display text-2xl text-lime" style={{ fontWeight: 400 }}>
            ¡Reembolso confirmado!
          </h2>
          <p className="mt-2 text-sm text-muted">
            Te devolvemos {formatMoney(result.amount)}. Lo verás acreditado según los plazos de tu
            medio de pago. Te avisamos por email cuando se complete.
          </p>
        </div>
      ) : (
        <div className="mt-8">
          <p className="text-sm text-muted">
            Al confirmar, se cancela tu compra y se procesa el reembolso del valor de la entrada. El
            costo por servicio (15%) no se reintegra.
          </p>
          {error && (
            <p className="mt-4 rounded-xl border border-violet/30 bg-violet/10 px-3 py-2 text-sm font-medium text-cyan">
              {error}
            </p>
          )}
          <button
            onClick={confirm}
            disabled={loading}
            className="btn-neon mt-6 w-full text-base disabled:opacity-50"
          >
            {loading ? 'Procesando…' : 'Confirmar reembolso'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ConfirmGuestRefundPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-20 text-sm text-muted">Cargando…</div>}>
      <ConfirmInner />
    </Suspense>
  );
}
