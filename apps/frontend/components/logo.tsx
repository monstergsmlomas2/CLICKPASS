import Link from 'next/link';
import { TicketMark } from './icons/ticket-mark';

export function Logo({ className = '', showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-2.5 ${className}`}>
      <TicketMark size={36} withGlow gradientId="cp-logo-grad" />
      {showWordmark && (
        <span className="font-display text-2xl tracking-tight text-fg" style={{ fontWeight: 700 }}>
          clickpass
        </span>
      )}
    </Link>
  );
}
