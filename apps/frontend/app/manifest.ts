import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Clickpass',
    short_name: 'Clickpass',
    description: 'La entrada que nunca se pierde. Comprá entradas para eventos en Argentina.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0912',
    theme_color: '#0A0912',
    orientation: 'portrait',
    lang: 'es',
    icons: [
      { src: '/manifest-icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/manifest-icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/manifest-icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
