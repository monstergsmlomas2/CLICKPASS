import Link from 'next/link';
import { ShieldCheck, Clock, Percent, Headset } from 'lucide-react';
import { ScrollReveal } from '../../components/scroll-reveal';

export const metadata = {
  title: 'Migrar desde Passline — Clickpass',
  description:
    'Si cancelan tu evento, te devolvemos el 100% en 48h hábiles o te damos un bono. Tu primer mes sin comisión, después solo 5%, sin cargos ocultos. Migrá tus eventos desde Passline por CSV en minutos.',
};

const COMPARISON: [string, string, string][] = [
  ['¿Qué pasa si se cancela un evento?', 'Reembolso lento, sin plazo claro', 'Garantizado en 48h hábiles o bono'],
  ['Comisión', '6% a 10% + cargo de emisión de QR', '1 mes gratis, después 5% todo incluido'],
  ['Migrar tus eventos', 'No existe', 'Por CSV, en minutos, sin contraseñas'],
  ['Soporte', 'Tickets que tardan días', 'Humano y rápido'],
];

const PILLARS = [
  {
    icon: ShieldCheck,
    title: '48h o bono',
    desc: 'Si un evento se cancela y no te devolvemos el 100% en 48h hábiles, te damos un bono compensatorio. Es una garantía, no una promesa de marketing.',
  },
  {
    icon: Percent,
    title: '1 mes gratis, después 5%',
    desc: 'Migrá y no pagás comisión tu primer mes. Después, una sola comisión del 5%, menos de la mitad que el 6-10% + cargo de QR de Passline. La ves antes de publicar, no después de vender.',
  },
  {
    icon: Clock,
    title: 'Migrás en minutos',
    desc: 'Subís tu CSV (o el export de Passline tal cual), validamos fila por fila y tus eventos quedan listos para publicar.',
  },
  {
    icon: Headset,
    title: 'Soporte que contesta',
    desc: 'No tickets eternos: alguien te responde cuando tenés un problema real.',
  },
];

export default function MigratePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <span className="chip text-emerald border-emerald/30">Passline Refugee Program</span>
      <h1 className="mt-5 font-display text-[clamp(2.5rem,7vw,5.5rem)] font-bold leading-[0.95] text-fg">
        ¿Te cansaste de
        <br />
        <span className="gradient-text animate-shimmer" style={{ backgroundSize: '200% auto' }}>Passline</span>?
      </h1>
      <p className="mt-5 max-w-2xl text-base text-muted md:text-lg">
        No competimos por tener las mismas funciones. Competimos por responder cuando algo sale
        mal: si tu evento se cancela, <strong className="text-fg">tu público recupera su plata
        en 48h hábiles o recibe un bono</strong> — con tope, pero garantizado. Tus
        <strong className="text-fg"> primer mes no pagás comisión</strong>, y después
        cobramos solo <strong className="text-fg">5%</strong> (vs. el 6-10% + cargo de QR de Passline).
      </p>

      <ScrollReveal className="mt-10 grid gap-4 sm:grid-cols-2">
        {PILLARS.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="glass-hover p-5">
            <Icon className="text-emerald" size={22} />
            <h3 className="mt-3 font-display text-lg font-semibold text-fg">{title}</h3>
            <p className="mt-1 text-sm text-muted">{desc}</p>
          </div>
        ))}
      </ScrollReveal>

      <div className="mt-12 glass overflow-hidden">
        <div className="grid grid-cols-3 border-b border-line bg-surface/80 font-mono text-xs uppercase tracking-widest">
          <span className="px-4 py-3 text-muted" />
          <span className="px-4 py-3 text-muted">Passline</span>
          <span className="px-4 py-3 text-emerald">Clickpass</span>
        </div>
        {COMPARISON.map(([k, a, b], i) => (
          <div
            key={k}
            className={`grid grid-cols-3 text-sm ${i % 2 ? 'bg-surface/40' : ''}`}
          >
            <span className="px-4 py-3 font-medium text-fg">{k}</span>
            <span className="px-4 py-3 text-muted">{a}</span>
            <span className="px-4 py-3 font-medium text-emerald">{b}</span>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/dashboard/organizer/import" className="btn-neon text-lg">
          Importar mis eventos (CSV)
        </Link>
        <Link href="/auth/register" className="btn-outline text-lg">
          Crear cuenta de organizador
        </Link>
      </div>
    </div>
  );
}
