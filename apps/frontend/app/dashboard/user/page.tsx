'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Ticket as TicketIcon, RotateCcw } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/store';
import type { Ticket } from '../../../lib/types';
import { formatMoney } from '../../../lib/format';

interface PaymentRow {
  id: string;
  status: string;
  amount: string;
  currency: string;
  eventDateId: string;
  ticketsCount: number;
}

const STATUS_STYLE: Record<string, string> = {
  CONFIRMED: 'text-lime border-lime/30',
  RESERVED: 'text-cyan border-cyan/30',
  REFUNDED: 'text-violet border-violet/30',
  USED: 'text-muted border-line',
};

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'CONFIRMADA',
  RESERVED: 'RESERVADA',
  REFUNDED: 'REEMBOLSADA',
  USED: 'USADA',
};

export default function UserDashboard() {
  const router = useRouter();
  const { user, accessToken, setSession } = useAuth();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [t, p] = await Promise.all([
      api<Ticket[]>('/tickets/mine', { auth: true }),
      api<PaymentRow[]>('/payments/mine', { auth: true }),
    ]);
    setTickets(t);
    setPayments(p);
  }, []);

  useEffect(() => {
    if (!accessToken) {
      router.push('/auth/login');
      return;
    }
    load().catch(() => setTickets([]));
  }, [accessToken, load, router]);

  async function requestRefund(paymentId: string) {
    setBusy(paymentId);
    setNotice(null);
    try {
      await api('/refunds/request', { method: 'POST', auth: true, body: { paymentId } });
      setNotice('Reembolso solicitado. Te avisaremos por email.');
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'No se pudo solicitar el reembolso');
    } finally {
      setBusy(null);
    }
  }

  async function becomeOrganizer() {
    setUpgrading(true);
    setNotice(null);
    try {
      const res = await api<{
        user: typeof user;
        accessToken: string;
        refreshToken: string;
      }>('/auth/become-organizer', { method: 'POST', auth: true });
      if (res.user) setSession({ user: res.user, accessToken: res.accessToken, refreshToken: res.refreshToken });
      router.push('/dashboard/organizer');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'No se pudo convertir la cuenta');
      setUpgrading(false);
    }
  }

  const confirmed = tickets?.filter((t) => t.status === 'CONFIRMED') ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="flex items-end justify-between">
        <div>
          <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-emerald">
            <TicketIcon size={14} /> Mi billetera
          </span>
          <h1 className="mt-1 font-display text-4xl font-bold text-fg">Mis entradas</h1>
        </div>
        <Link href="/events/search" className="btn-outline hidden sm:inline-flex text-sm !px-4 !py-2">
          Buscar más eventos
        </Link>
      </header>

      {notice && (
        <p className="mt-6 glass border-cyan/30 px-4 py-3 text-sm font-medium text-cyan">
          {notice}
        </p>
      )}

      {user?.role === 'USER' && (
        <div className="mt-6 glass flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted">
            ¿Organizás eventos? Empezá a vender tus propias entradas con Clickpass.
          </p>
          <button
            onClick={becomeOrganizer}
            disabled={upgrading}
            className="btn-neon text-sm !px-4 !py-2 disabled:opacity-50"
          >
            {upgrading ? 'Activando…' : 'Convertite en organizador'}
          </button>
        </div>
      )}

      {tickets === null ? (
        <p className="mt-10 font-mono text-sm text-muted">Cargando tu billetera…</p>
      ) : confirmed.length === 0 ? (
        <div className="glass mt-10 flex flex-col items-center gap-3 px-6 py-20 text-center">
          <span className="chip text-muted">Todavía no tenés entradas</span>
          <Link href="/events/search" className="btn-neon mt-2">
            Explorar eventos
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {confirmed.map((t, i) => {
            const payment = payments.find((p) => p.id === t.purchaseId);
            const refundable = payment?.status === 'SUCCEEDED';
            return (
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
                    <p className="mt-2 truncate font-mono text-xs text-muted">
                      #{t.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="mt-1 font-mono text-2xl font-bold text-lime">
                      {formatMoney(t.price, t.currency)}
                    </p>
                  </div>
                </div>
                <div className="divider" />
                <div className="flex items-center justify-between px-6 py-3">
                  <span className="font-mono text-xs uppercase tracking-widest text-muted">
                    Presentá este QR en el ingreso
                  </span>
                  {refundable && payment && (
                    <button
                      onClick={() => requestRefund(payment.id)}
                      disabled={busy === payment.id}
                      className="flex items-center gap-1.5 text-sm font-medium text-emerald hover:underline disabled:opacity-50 transition-colors"
                    >
                      <RotateCcw size={14} /> {busy === payment.id ? '…' : 'Pedir reembolso'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
