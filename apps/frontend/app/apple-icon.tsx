import { ImageResponse } from 'next/og';
import { TicketMark } from '../components/icons/ticket-mark';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A0912',
        }}
      >
        <TicketMark size={140} gradientId="cp-apple-icon-grad" />
      </div>
    ),
    { ...size }
  );
}
