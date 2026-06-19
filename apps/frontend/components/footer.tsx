import Link from 'next/link';
import { Logo } from './logo';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-surface/80">
      {/* Marquee neón */}
      <div className="marquee border-b border-line py-3">
        <div className="marquee-track flex gap-8 font-mono text-sm uppercase tracking-[0.25em] text-muted">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="flex items-center gap-8">
              LA ENTRADA QUE NUNCA SE PIERDE <span className="text-lime text-glow-lime">✦</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div className="sm:col-span-2 md:col-span-1">
          <Logo showWordmark className="[&_span:last-child]:text-fg" />
          <p className="mt-4 max-w-xs text-sm text-muted">
            La entrada que nunca se pierde. Reembolsos rápidos garantizados en Argentina.
          </p>
        </div>
        <FooterCol title="Producto" links={[['Explorar eventos', '/events/search'], ['Garantía 48h', '/#garantia'], ['Para organizadores', '/dashboard/organizer']]} />
        <FooterCol title="Migrar" links={[['Vengo de Passline', '/migrate-from-passline'], ['Importar mis eventos', '/dashboard/organizer/import']]} />
        <FooterCol title="Legales" links={[['Términos', '/terms'], ['Privacidad', '/privacy']]} />
      </div>

      <div className="border-t border-line px-4 py-5 text-center text-xs text-muted/60">
        © {new Date().getFullYear()} Clickpass · Clickpass no es responsable por el contenido del evento.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="mb-4 font-mono text-xs uppercase tracking-widest text-lime">{title}</h4>
      <ul className="space-y-2.5 text-sm text-muted">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="hover:text-fg transition-colors">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
