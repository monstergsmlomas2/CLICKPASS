'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { EventItem } from '../../lib/types';
import { getEventImage } from '../../lib/eventImages';
import { formatMoney } from '../../lib/format';

gsap.registerPlugin(ScrollTrigger);

export function Hero({ event }: { event: EventItem | null }) {
  const root = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo('.hero-eyebrow', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6 })
      .fromTo('.hero-line', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.1 }, '-=0.3')
      .fromTo('.hero-sub', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.2')
      .fromTo('.hero-cta', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }, '-=0.3');

    if (!reduced && imgRef.current) {
      gsap.to(imgRef.current, {
        yPercent: 14,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      });
    }
  }, { scope: root });

  const minPrice = event?.dates.length
    ? Math.min(...event.dates.map((d) => Number(d.price)))
    : null;
  const next = event
    ? [...event.dates].sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate))[0]
    : null;

  return (
    <section ref={root} className="relative overflow-hidden">
      {event && (
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <div ref={imgRef} className="absolute inset-0 -top-[8%] h-[116%]">
            <Image
              src={getEventImage(event.category, event.bannerUrl, event.id)}
              alt=""
              fill
              priority
              className="object-cover opacity-40"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-night via-night/75 to-night/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-violet/25 via-transparent to-emerald/15" />
        </div>
      )}

      <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
        <div className="max-w-3xl">
          <span className="hero-eyebrow chip border-emerald/30 text-emerald">
            🎫 Entradas en Argentina
          </span>

          <h1 className="mt-6 font-display text-[clamp(2.6rem,7vw,5rem)] font-bold leading-[1.02] tracking-tight text-fg">
            <span className="hero-line block">Comprá entradas a</span>
            <span className="hero-line gradient-text block">los mejores eventos</span>
            <span className="hero-line block">sin perderte nada</span>
          </h1>

          <p className="hero-sub mt-6 max-w-xl text-base text-muted md:text-lg">
            Música, teatro, deportes y festivales en todo el país. Y si el evento se
            cancela, <strong className="text-fg">te devolvemos el 100%</strong> en{' '}
            <strong className="text-emerald">48 horas hábiles</strong>. Sin vueltas.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/events/search" className="hero-cta btn-neon text-lg">
              Explorar eventos
            </Link>
            <Link href="/migrate-from-passline" className="hero-cta btn-outline text-lg">
              Vengo de Passline
            </Link>
          </div>
        </div>

        {event && (
          <Link
            href={`/events/${event.id}`}
            className="hero-cta glass mt-12 flex max-w-md items-center gap-4 p-4 transition-transform hover:-translate-y-1"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
              <Image src={getEventImage(event.category, event.bannerUrl, event.id)} alt={event.title} fill className="object-cover" />
            </div>
            <div className="min-w-0">
              <span className="font-mono text-[10px] uppercase tracking-widest text-emerald">
                Destacado{next ? ` · ${new Date(next.startDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}` : ''}
              </span>
              <p className="truncate font-display font-semibold text-fg">{event.title}</p>
              {minPrice !== null && (
                <span className="font-mono text-sm text-muted">desde {formatMoney(minPrice)}</span>
              )}
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}
