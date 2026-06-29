'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Ticket as TicketIcon, RotateCcw } from 'lucide-react';
import { api } from '../../../lib/api';
import { formatMoney, formatDate } from '../../../lib/format';

interface GuestTicket {
  id: string;
  qrCode: string;
  status: 'CONFIRMED' | 'USED' | 'REFUNDED';
  price: string;
  currency: string;
  purchaseId?: string | null;
  eventTitle: string;
  eventStartDate: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  CONFIRMED: 'text-lime border-lime/30',
  REFUNDED: 'text-violet border-violet/30',
  USED: 'text-muted border-line',
};

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'CONFIRMADA',
  REFUNDED: 'REEMBOLSADA',
  USED: 'USADA',
};

function ViewInner() {
  const token = useSearchParams().get('token') ?? '';
  const [tickets, setTickets] = useState<GuestTicket[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError('El link no es válido. Pedí uno nuevo.');
      setTickets([]);
      return;
    }
    try {
      const res = await api<{ email: string; tickets: GuestTicket[] }>('/tickets/view', {
        method: 'POST',
        body: { token },
      });
      setTickets(res.tickets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar tus entradas');
      setTickets([]);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="flex items-end justify-between">
        <div>
          <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-emerald">
            <TicketIcon size={14} /> Mis entradas
          </span>
          <h1 className="mt-1 font-display text-4xl font-bold text-fg">Tus entradas</h1>
        </div>
        <Link href="/events/search" className="btn-outline hidden sm:inline-flex text-sm !px-4 !py-2">
          Buscar más eventos
        </Link>
      </header>

      {error && (
        <div className="glass mt-10 flex flex-col items-center gap-3 px-6 py-16 text-center">
          <p className="text-sm text-cyan">{error}</p>
          <Link href="/tickets/lookup" className="btn-neon mt-2">
            Pedir un link nuevo
          </Link>
        </div>
      )}

      {!error && tickets === null ? (
        <p className="mt-10 font-mono text-sm text-muted">Cargando tus entradas…</p>
      ) : !error && tickets && tickets.length === 0 ? (
        <div className="glass mt-10 flex flex-col items-center gap-3 px-6 py-20 text-center">
          <span className="chip text-muted">No encontramos entradas</span>
          <Link href="/events/search" className="btn-neon mt-2">
            Explorar eventos
          </Link>
        </div>
      ) : (
        tickets && (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {tickets.map((t, i) => (
              <div key={t.id} className="glass animate-rise-in overflow-hidden" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="flex gap-5 p-6">
                  <div className="shrink-0 rounded-xl border border-line bg-surface/80 p-2">
                    <QRCodeSVG
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/checkin/${t.qrCode}`}
                      size={104}
                      bgColor="#14111F"
                      fgColor="#10E89C"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={`chip ${STATUS_STYLE[t.status] ?? 'text-muted border-line'}`}>
                      {STATUS_LABEL[t.status] ?? t.status}
                    </span>
                    <p className="mt-2 truncate font-display text-lg text-fg">{t.eventTitle}</p>
                    {t.eventStartDate && (
                      <p className="font-mono text-xs text-muted">{formatDate(t.eventStartDate)}</p>
                    )}
                    <p className="mt-1 font-mono text-2xl font-bold text-lime">
                      {Number(t.price) > 0 ? formatMoney(t.price, t.currency) : 'Gratis'}
                    </p>
                  </div>
                </div>
                <div className="divider" />
                <div className="flex items-center justify-between px-6 py-3">
                  <span className="font-mono text-xs uppercase tracking-widest text-muted">
                    Presentá este QR en el ingreso
                  </span>
                  {t.status === 'CONFIRMED' && (
                    <Link
                      href="/refunds/request"
                      className="flex items-center gap-1.5 text-sm font-medium text-emerald hover:underline"
                    >
                      <RotateCcw size={14} /> Pedir reembolso
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

export default function GuestTicketsViewPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-20 text-sm text-muted">Cargando…</div>}>
      <ViewInner />
    </Suspense>
  );
}
