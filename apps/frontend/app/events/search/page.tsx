import Link from 'next/link';
import { apiPublic } from '../../../lib/api';
import type { EventItem } from '../../../lib/types';
import { EventCard } from '../../../components/event-card';

export const dynamic = 'force-dynamic';

const CATEGORIES = [
  { label: 'Todos', value: '' },
  { label: 'Música', value: 'musica' },
  { label: 'Teatro', value: 'teatro' },
  { label: 'Deporte', value: 'deporte' },
  { label: 'Festivales', value: 'festival' },
];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const all = (await apiPublic<EventItem[]>('/events?take=50')) ?? [];
  const q = (searchParams.q ?? '').toLowerCase();
  const category = searchParams.category ?? '';

  const events = all.filter((e) => {
    const matchesQuery = q
      ? e.title.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.city ?? '').toLowerCase().includes(q)
      : true;
    const matchesCategory = category ? e.category.toLowerCase() === category : true;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <span className="font-mono text-xs uppercase tracking-widest text-emerald">Cartelera</span>
      <h1 className="mt-1 font-display text-[clamp(2.2rem,5vw,3.5rem)] font-bold text-fg">
        Explorá eventos
      </h1>
      <p className="mt-3 max-w-xl text-muted">
        Buscá por nombre, ciudad o categoría. Filtrá la cartelera completa de Clickpass y
        encontrá tu próxima entrada.
      </p>

      <form className="mt-6 flex max-w-xl gap-2" action="/events/search">
        {category && <input type="hidden" name="category" value={category} />}
        <input
          name="q"
          defaultValue={searchParams.q ?? ''}
          placeholder="Buscar por nombre, categoría o ciudad…"
          className="field"
        />
        <button className="btn-neon whitespace-nowrap">Buscar</button>
      </form>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <Link
            key={c.value}
            href={c.value ? `/events/search?category=${c.value}` : '/events/search'}
            className={`chip shrink-0 transition-colors ${
              category === c.value
                ? 'border-emerald/40 bg-emerald/10 text-emerald'
                : 'text-muted hover:text-fg'
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="glass mt-10 px-6 py-16 text-center">
          <p className="text-muted">
            No encontramos eventos{q && ` para "${searchParams.q}"`}.{' '}
            <Link href="/events/search" className="font-medium text-emerald hover:underline">
              Ver todos
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e, i) => (
            <div key={e.id} className="animate-rise-in" style={{ animationDelay: `${i * 0.06}s` }}>
              <EventCard event={e} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
