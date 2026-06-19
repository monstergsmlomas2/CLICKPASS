import Link from 'next/link';
import { Music, Drama, Trophy, PartyPopper, LayoutGrid } from 'lucide-react';

const CATEGORIES = [
  { label: 'Todos', value: '', icon: LayoutGrid },
  { label: 'Música', value: 'musica', icon: Music },
  { label: 'Teatro', value: 'teatro', icon: Drama },
  { label: 'Deporte', value: 'deporte', icon: Trophy },
  { label: 'Festivales', value: 'festival', icon: PartyPopper },
];

export function CategoryBar() {
  return (
    <section className="relative z-10 mx-auto -mt-6 max-w-6xl px-4">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {CATEGORIES.map(({ label, value, icon: Icon }) => (
          <Link
            key={value}
            href={value ? `/events/search?category=${value}` : '/events/search'}
            className="glass-hover flex shrink-0 items-center gap-2 px-5 py-2.5 text-sm font-medium text-fg"
          >
            <Icon size={16} className="text-emerald" />
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}
