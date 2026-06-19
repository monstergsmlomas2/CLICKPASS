import Link from 'next/link';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import type { EventItem } from '../lib/types';
import { formatMoney } from '../lib/format';
import { getEventImage } from '../lib/eventImages';

export function EventCard({ event }: { event: EventItem }) {
  const next = [...event.dates].sort(
    (a, b) => +new Date(a.startDate) - +new Date(b.startDate),
  )[0];
  const minPrice = event.dates.length
    ? Math.min(...event.dates.map((d) => Number(d.price)))
    : 0;
  const image = getEventImage(event.category, event.bannerUrl, event.id);

  return (
    <Link href={`/events/${event.id}`} className="event-card-img group">
      <Image
        src={image}
        alt={event.title}
        fill
        sizes="(max-width: 768px) 50vw, 25vw"
        className="object-cover transition-transform duration-500 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-night via-night/55 to-night/10" />

      <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
        <span className="chip border-white/25 bg-black/50 text-white/90 backdrop-blur-sm">
          {event.category}
        </span>
        {next && (
          <span className="rounded-md bg-black/55 px-2 py-1 font-mono text-[10px] font-bold tracking-wider text-emerald backdrop-blur-sm">
            {new Date(next.startDate)
              .toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
              .toUpperCase()}
          </span>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="font-display text-lg font-semibold leading-tight text-fg drop-shadow-lg line-clamp-2">
          {event.title}
        </h3>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
          <MapPin size={12} className="shrink-0 text-violet" />
          <span className="truncate">
            {event.venueName ? `${event.venueName} · ` : ''}
            {event.city ?? 'Argentina'}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">
              desde
            </span>
            <span className="font-mono text-base font-bold text-emerald">
              {minPrice ? formatMoney(minPrice) : 'Gratis'}
            </span>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-fg opacity-0 transition-opacity group-hover:opacity-100">
            Comprar →
          </span>
        </div>
      </div>
    </Link>
  );
}
