import { ImageResponse } from 'next/og';
import { TicketMark } from '../components/icons/ticket-mark';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
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
        <TicketMark size={28} gradientId="cp-favicon-grad" />
      </div>
    ),
    { ...size }
  );
}
