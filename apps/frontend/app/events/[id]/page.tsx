import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, ShieldCheck, Users } from 'lucide-react';
import { apiPublic } from '../../../lib/api';
import type { EventItem } from '../../../lib/types';
import { BuyBox } from '../../../components/buy-box';
import { formatDate } from '../../../lib/format';
import { getEventImage } from '../../../lib/eventImages';
import { ScrollReveal } from '../../../components/scroll-reveal';

export const dynamic = 'force-dynamic';

const POLICY_LABEL: Record<string, string> = {
  STANDARD: 'Reembolso 100% si se cancela el evento (48h hábiles)',
  FLEXIBLE: 'Reembolso flexible hasta 24h antes del evento',
  NO_REFUND: 'Sin reembolsos voluntarios',
};

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const event = await apiPublic<EventItem>(`/events/${params.id}`);
  if (!event) notFound();

  const image = getEventImage(event.category, event.bannerUrl, event.id);

  return (
    <article>
      {/* Hero con imagen real a pantalla ancha */}
      <div className="relative h-[42vh] min-h-[280px] w-full overflow-hidden">
        <Image src={image} alt={event.title} fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/70 to-night/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-violet/20 via-transparent to-emerald/10" />

        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 py-8">
          <Link href="/events/search" className="inline-flex items-center gap-1.5 text-sm font-medium text-fg/80 hover:text-emerald transition-colors">
            <ArrowLeft size={16} /> Volver a la cartelera
          </Link>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="chip border-white/25 bg-black/40 text-white/90 backdrop-blur-sm">
              {event.category}
            </span>
            {event.status === 'CANCELLED' && (
              <span className="chip text-cyan border-cyan/30 bg-black/40 backdrop-blur-sm">Cancelado</span>
            )}
          </div>

          <h1 className="mt-3 font-display text-[clamp(2.2rem,5.5vw,4rem)] font-bold leading-[0.98] text-fg drop-shadow-lg">
            {event.title}
          </h1>
          <p className="mt-3 flex items-center gap-1.5 text-base text-muted">
            <MapPin size={16} className="text-emerald" />
            {event.venueName ?? 'Sede a confirmar'} · {event.city ?? 'Argentina'}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <ScrollReveal className="space-y-10">
            {event.description && (
              <p className="max-w-2xl leading-relaxed text-muted">{event.description}</p>
            )}

            {/* Fechas en filas glass */}
            <div>
              <h2 className="font-mono text-xs uppercase tracking-widest text-emerald">Funciones</h2>
              <ul className="mt-3 space-y-3">
                {event.dates.map((d) => {
                  const left = d.capacity - d.ticketsSold;
                  const soldOut = d.status === 'SOLD_OUT' || left <= 0;
                  return (
                    <li
                      key={d.id}
                      className="glass flex items-center justify-between px-5 py-4"
                    >
                      <span className="font-medium text-fg">{formatDate(d.startDate)}</span>
                      <span className={`flex items-center gap-1.5 font-mono text-sm ${soldOut ? 'text-muted' : 'text-emerald'}`}>
                        <Users size={14} />
                        {soldOut ? 'Agotado' : `${left} lugares`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Garantía destacada */}
            <div className="glass border-emerald/20 p-6">
              <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-emerald">
                <ShieldCheck size={20} /> Tu compra protegida
              </h3>
              <p className="mt-2 text-sm text-muted">{POLICY_LABEL[event.refundPolicy]}</p>
            </div>
          </ScrollReveal>

          {event.status === 'PUBLISHED' ? (
            <BuyBox event={event} />
          ) : (
            <aside className="glass p-6 text-center">
              <p className="text-muted">
                {event.status === 'CANCELLED'
                  ? 'Este evento fue cancelado.'
                  : 'Este evento todavía no está a la venta.'}
              </p>
            </aside>
          )}
        </div>
      </div>
    </article>
  );
}
