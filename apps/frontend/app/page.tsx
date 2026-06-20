import Link from 'next/link';
import { MousePointerClick, CreditCard, Ticket, ShieldCheck, RotateCcw, Headset } from 'lucide-react';
import { apiPublic } from '../lib/api';
import type { EventItem } from '../lib/types';
import { EventCard } from '../components/event-card';
import { Hero } from '../components/home/hero';
import { CategoryBar } from '../components/home/category-bar';
import { ScrollReveal } from '../components/scroll-reveal';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const events = (await apiPublic<EventItem[]>('/events?take=9')) ?? [];
  const featured = events[0] ?? null;
  const rest = featured ? events.slice(1) : events;

  return (
    <>
      <Hero event={featured} />
      <CategoryBar />
      <EventsSection events={rest} />
      <HowItWorks />
      <TrustSection />
      <CTASection />
    </>
  );
}

function EventsSection({ events }: { events: EventItem[] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-emerald">
            En cartelera
          </span>
          <h2 className="mt-1 font-display text-3xl font-bold text-fg">Próximos eventos</h2>
        </div>
        <Link href="/events/search" className="hidden font-medium text-muted transition-colors hover:text-emerald sm:inline">
          Ver todos →
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
          <span className="chip text-muted">Cartelera vacía</span>
          <p className="max-w-md text-sm text-muted">
            Todavía no hay eventos publicados. Si sos organizador, creá el primero y empezá a
            vender en minutos.
          </p>
          <Link href="/dashboard/organizer" className="btn-neon mt-2">
            Soy organizador
          </Link>
        </div>
      ) : (
        <ScrollReveal className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </ScrollReveal>
      )}
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: MousePointerClick, title: 'Elegí tu evento', desc: 'Explorá miles de eventos y encontrá el que más te guste.' },
    { icon: CreditCard, title: 'Comprá en un clic', desc: 'Pago rápido y seguro con MercadoPago, sin vueltas.' },
    { icon: Ticket, title: 'Recibí tu entrada', desc: 'Llega directo con QR único, listo para usar en el ingreso.' },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="text-center font-display text-3xl font-bold text-fg">Cómo funciona</h2>
      <p className="mt-2 text-center text-muted">Tres pasos, cero complicaciones.</p>

      <ScrollReveal className="mt-12 grid gap-6 sm:grid-cols-3">
        {steps.map(({ icon: Icon, title, desc }, i) => (
          <div key={title} className="glass-hover p-6 text-center">
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: 'linear-gradient(135deg, #9D4EFF, #10E89C)', boxShadow: '0 0 25px rgba(16,232,156,0.25)' }}
            >
              <Icon className="text-night" size={26} />
            </div>
            <span className="font-mono text-xs font-bold tracking-wider text-emerald">PASO {i + 1}</span>
            <h3 className="mt-1 font-display text-lg font-semibold text-fg">{title}</h3>
            <p className="mt-2 text-sm text-muted">{desc}</p>
          </div>
        ))}
      </ScrollReveal>
    </section>
  );
}

function TrustSection() {
  const items = [
    { icon: RotateCcw, title: 'Reembolso en 48h', desc: 'Si el evento se cancela, te devolvemos todo.' },
    { icon: ShieldCheck, title: 'Pago protegido', desc: 'Datos encriptados, procesamos con MercadoPago.' },
    { icon: Headset, title: 'Atención humana', desc: 'Sin tickets eternos ni respuestas automáticas.' },
  ];

  return (
    <section id="garantia" className="border-y border-line">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <ScrollReveal className="grid gap-4 sm:grid-cols-3">
          {items.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="trust-item">
              <Icon size={22} className="text-emerald" />
              <h3 className="font-display text-base font-semibold text-fg">{title}</h3>
              <p className="text-xs text-muted">{desc}</p>
            </div>
          ))}
        </ScrollReveal>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="glass relative overflow-hidden p-10 text-center sm:p-16">
        <div className="absolute inset-0 bg-gradient-to-br from-violet/20 via-transparent to-emerald/15" />
        <div className="relative">
          <h2 className="font-display text-3xl font-bold text-fg">¿Querés vender tus entradas?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Empezá a vender hoy mismo con la plataforma más simple para organizadores.
            Comisiones transparentes, sin costos ocultos.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/auth/register?type=organizer" className="btn-neon text-base">
              Empezar ahora
            </Link>
            <Link href="/migrate-from-passline" className="btn-outline text-base">
              Vengo de Passline
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
