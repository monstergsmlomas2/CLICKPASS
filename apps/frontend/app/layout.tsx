import type { Metadata, Viewport } from 'next';
import { Outfit, Sora, Space_Mono } from 'next/font/google';
import './globals.css';
import { MeshBackground } from '../components/mesh-bg';
import { Nav } from '../components/nav';
import { Footer } from '../components/footer';
import { PwaRegister } from '../components/pwa-register';

const display = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
});

const sans = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

const mono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Clickpass — Click. Pass. Listo.',
  description:
    'La entrada que nunca se pierde. Comprá entradas para eventos en Argentina con reembolsos rápidos garantizados.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Clickpass',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0A0912',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <PwaRegister />
        <MeshBackground />
        <div className="relative z-10 flex min-h-screen flex-col">
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
