'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

const BLOBS = [
  { w: 560, h: 560, color: 'rgba(157,78,255,0.65)', top: '-12%', left: '-8%', depth: 30, anim: 'animate-float-slow' },
  { w: 420, h: 420, color: 'rgba(16,232,156,0.5)', bottom: '-8%', right: '-6%', depth: 20, anim: 'animate-float' },
  { w: 380, h: 380, color: 'rgba(56,232,255,0.4)', top: '42%', left: '48%', depth: 38, anim: 'animate-float-fast' },
  { w: 320, h: 320, color: 'rgba(255,46,196,0.4)', top: '8%', right: '12%', depth: 24, anim: 'animate-float' },
  { w: 260, h: 260, color: 'rgba(157,78,255,0.5)', top: '65%', right: '28%', depth: 32, anim: 'animate-float-faster' },
  { w: 300, h: 300, color: 'rgba(255,46,196,0.45)', bottom: '5%', left: '20%', depth: 26, anim: 'animate-float-fast' },
  { w: 240, h: 240, color: 'rgba(16,232,156,0.55)', top: '20%', left: '30%', depth: 36, anim: 'animate-float-faster' },
  { w: 340, h: 340, color: 'rgba(56,232,255,0.45)', bottom: '30%', right: '40%', depth: 22, anim: 'animate-float-slow' },
];

export function MeshBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const innerRefs = useRef<(HTMLDivElement | null)[]>([]);

  // La deriva lenta (siempre visible) corre por CSS puro en el contenedor (.animate-float*).
  // GSAP solo agrega el parallax de cursor sobre la capa interna, así nunca compiten
  // por la misma propiedad transform del mismo elemento.
  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const moveX = innerRefs.current.map((el) =>
      el ? gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3.out' }) : null,
    );
    const moveY = innerRefs.current.map((el) =>
      el ? gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3.out' }) : null,
    );

    function onMove(e: PointerEvent) {
      const dx = e.clientX / window.innerWidth - 0.5;
      const dy = e.clientY / window.innerHeight - 0.5;
      BLOBS.forEach((b, i) => {
        moveX[i]?.(dx * b.depth * 2);
        moveY[i]?.(dy * b.depth * 2);
      });
    }

    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, { scope: ref });

  return (
    <div className="mesh-bg" aria-hidden="true" ref={ref}>
      {BLOBS.map((b, i) => (
        <div
          key={i}
          className={`mesh-blob-wrap ${b.anim}`}
          style={{
            width: b.w,
            height: b.h,
            top: b.top,
            left: b.left,
            bottom: (b as any).bottom,
            right: (b as any).right,
          }}
        >
          <div
            ref={(el) => { innerRefs.current[i] = el; }}
            className="mesh-blob"
            style={{ background: `radial-gradient(circle, ${b.color}, transparent 70%)` }}
          />
        </div>
      ))}
    </div>
  );
}
