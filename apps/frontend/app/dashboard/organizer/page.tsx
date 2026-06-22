'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Store, Upload, Eye, Plus, Megaphone, Ban, Beer } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/store';
import type { EventItem } from '../../../lib/types';
import { formatMoney, formatDateShort } from '../../../lib/format';

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'text-muted border-line',
  PUBLISHED: 'text-emerald border-emerald/30',
  CANCELLED: 'text-cyan border-cyan/30',
  COMPLETED: 'text-violet border-violet/30',
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'BORRADOR',
  PUBLISHED: 'PUBLICADO',
  CANCELLED: 'CANCELADO',
  COMPLETED: 'FINALIZADO',
};

interface Penalty {
  id: string;
  amount: string;
  currency: string;
  status: 'PENDING' | 'SETTLED';
  createdAt: string;
}

export default function OrganizerDashboard() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [eventsData, penaltiesData] = await Promise.all([
      api<EventItem[]>('/events/mine/list', { auth: true }),
      api<Penalty[]>('/payouts/penalties', { auth: true }),
    ]);
    setEvents(eventsData);
    setPenalties(penaltiesData);
  }, []);

  useEffect(() => {
    if (!accessToken) {
      router.push('/auth/login');
      return;
    }
    if (user && user.role !== 'ORGANIZER' && user.role !== 'ADMIN') {
      router.push('/');
      return;
    }
    load().catch(() => setEvents([]));
  }, [accessToken, user, load, router]);

  const pendingPenalties = penalties.filter((p) => p.status === 'PENDING');
  const pendingPenaltyTotal = pendingPenalties.reduce((acc, p) => acc + Number(p.amount), 0);

  async function publish(id: string) {
    setBusy(id);
    setError(null);
    try {
      await api(`/events/${id}/publish`, { method: 'POST', auth: true });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo publicar');
    } finally {
      setBusy(null);
    }
  }

  async function cancel(id: string) {
    if (
      !confirm(
        '¿Seguro? Se cancela el evento, se reembolsa el 100% a los compradores (incluido el costo de servicio) y se te aplica una multa por la comisión y el costo de servicio perdidos. Se descuenta de tu próxima liquidación.',
      )
    )
      return;
    setBusy(id);
    setError(null);
    try {
      await api(`/events/${id}/cancel`, { method: 'POST', auth: true });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cancelar');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-emerald">
            <Store size={14} /> Organizadores
          </span>
          <h1 className="mt-1 font-display text-4xl font-bold text-fg">Tu panel</h1>
        </div>
        <Link href="/dashboard/organizer/new" className="btn-neon text-sm !px-5 !py-2">
          <Plus size={16} /> Crear evento
        </Link>
      </div>

      {pendingPenalties.length > 0 && (
        <div className="mt-6 rounded-xl border border-violet/30 bg-violet/10 px-4 py-3 text-sm text-cyan">
          Tenés <strong>{formatMoney(pendingPenaltyTotal)}</strong> en multas pendientes por cancelación de eventos
          ({pendingPenalties.length}). Se descuentan automáticamente de tu próxima liquidación.
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card icon={Upload} title="Importar desde Passline" desc="Subí tu CSV y creá tus eventos en minutos." href="/dashboard/organizer/import" cta="Importar CSV" />
        <Card icon={Eye} title="Ver la cartelera" desc="Así se ven tus eventos publicados para el público." href="/events/search" cta="Ver eventos" />
      </div>

      <h2 className="mt-12 font-mono text-xs uppercase tracking-widest text-muted">Tus eventos</h2>

      {error && (
        <p className="mt-4 rounded-xl border border-violet/30 bg-violet/10 px-4 py-2 text-sm font-medium text-cyan">
          {error}
        </p>
      )}

      {events === null ? (
        <p className="mt-6 font-mono text-sm text-muted">Cargando…</p>
      ) : events.length === 0 ? (
        <div className="glass mt-6 flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="chip text-muted">Todavía no creaste ningún evento</span>
          <Link href="/dashboard/organizer/new" className="btn-neon mt-2">Crear mi primer evento</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {events.map((e) => {
            const sold = e.dates.reduce((acc, d) => acc + d.ticketsSold, 0);
            const capacity = e.dates.reduce((acc, d) => acc + d.capacity, 0);
            const minPrice = e.dates.length ? Math.min(...e.dates.map((d) => Number(d.price))) : 0;
            return (
              <div key={e.id} className="glass p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className={`chip ${STATUS_STYLE[e.status]}`}>{STATUS_LABEL[e.status]}</span>
                    <h3 className="mt-2 font-display text-xl font-semibold text-fg">{e.title}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {e.category} · {e.city ?? 'Sin ciudad'} · desde {minPrice ? formatMoney(minPrice) : 'gratis'}
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted">
                      {sold}/{capacity} vendidas · {e.dates.length} función{e.dates.length !== 1 ? 'es' : ''}
                      {e.dates[0] && ` · próxima ${formatDateShort(e.dates.slice().sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate))[0].startDate)}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/organizer/events/${e.id}/products`}
                      className="btn-outline flex items-center gap-1.5 text-sm !px-4 !py-2"
                    >
                      <Beer size={14} /> Combos
                    </Link>
                    {e.status === 'DRAFT' && (
                      <button
                        onClick={() => publish(e.id)}
                        disabled={busy === e.id}
                        className="btn-neon flex items-center gap-1.5 text-sm !px-4 !py-2 disabled:opacity-50"
                      >
                        <Megaphone size={14} /> Publicar
                      </button>
                    )}
                    {e.status !== 'CANCELLED' && (
                      <button
                        onClick={() => cancel(e.id)}
                        disabled={busy === e.id}
                        className="btn-outline flex items-center gap-1.5 text-sm !px-4 !py-2 disabled:opacity-50"
                      >
                        <Ban size={14} /> Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  desc,
  href,
  cta,
}: {
  icon: typeof Upload;
  title: string;
  desc: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="glass-hover flex flex-col justify-between p-6">
      <div>
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #9D4EFF, #10E89C)' }}>
          <Icon className="text-night" size={20} />
        </div>
        <h3 className="font-display text-xl font-semibold text-fg">{title}</h3>
        <p className="mt-2 text-sm text-muted">{desc}</p>
      </div>
      <Link href={href} className="btn-neon mt-5 self-start text-sm !px-5 !py-2">{cta}</Link>
    </div>
  );
}
