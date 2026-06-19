type TicketMarkProps = {
  size?: number;
  withGlow?: boolean;
  gradientId?: string;
};

const TICKET_OUTLINE = [
  'M 23 28',
  'L 55.5 28',
  'A 7.5 7.5 0 0 0 70.5 28',
  'L 77 28',
  'A 9 9 0 0 1 86 37',
  'L 86 63',
  'A 9 9 0 0 1 77 72',
  'L 70.5 72',
  'A 7.5 7.5 0 0 0 55.5 72',
  'L 23 72',
  'A 9 9 0 0 1 14 63',
  'L 14 37',
  'A 9 9 0 0 1 23 28',
  'Z',
].join(' ');

/** Isotipo de Clickpass: ticket con muesca lateral + check de validación. */
export function TicketMark({ size = 40, withGlow = false, gradientId = 'cp-ticket-grad' }: TicketMarkProps) {
  const glowId = `${gradientId}-glow`;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="10" y1="10" x2="90" y2="90">
          <stop offset="0%" stopColor="#9D4EFF" />
          <stop offset="100%" stopColor="#10E89C" />
        </linearGradient>
        {withGlow && (
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      <g filter={withGlow ? `url(#${glowId})` : undefined}>
        <path d={TICKET_OUTLINE} stroke={`url(#${gradientId})`} strokeWidth="5" strokeLinejoin="round" />
        <rect x="60" y="36" width="3" height="6" rx="1.5" fill={`url(#${gradientId})`} />
        <rect x="60" y="46" width="3" height="6" rx="1.5" fill={`url(#${gradientId})`} />
        <rect x="60" y="56" width="3" height="6" rx="1.5" fill={`url(#${gradientId})`} />
        <path
          d="M27 51 L38 61 L55 37"
          stroke={`url(#${gradientId})`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
