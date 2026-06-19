import { ImageResponse } from 'next/og';
import { TicketMark } from '../../../components/icons/ticket-mark';

export const runtime = 'edge';

export async function GET(_request: Request, { params }: { params: { size: string } }) {
  const size = params.size === '512' ? 512 : 192;
  const markSize = Math.round(size * 0.78);

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
        <TicketMark size={markSize} gradientId="cp-manifest-icon-grad" />
      </div>
    ),
    { width: size, height: size }
  );
}
