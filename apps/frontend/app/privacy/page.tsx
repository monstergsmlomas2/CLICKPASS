import { Lock, CheckCircle2 } from 'lucide-react';

export const metadata = { title: 'Política de Privacidad — Clickpass' };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-16">
      <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-emerald">
        <Lock size={14} /> Legales
      </span>
      <h1 className="mt-1 font-display text-4xl font-bold text-fg">Política de Privacidad</h1>
      <div className="mt-8 space-y-6 text-muted">
        <p className="leading-relaxed">
          Tratamos tus datos conforme a la normativa de protección de datos vigente en Argentina
          y estándares internacionales (GDPR/LGPD donde aplique).
        </p>
        <ul className="space-y-3">
          <li className="flex items-start gap-2">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald" />
            <span>Consentimiento explícito al registrarte.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald" />
            <span>Derecho de acceso y exportación de tus datos.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald" />
            <span>Derecho al olvido: podés pedir la baja de tus datos.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald" />
            <span>Solo enviamos promociones si las aceptás (opt-in).</span>
          </li>
        </ul>
        <p className="text-xs text-muted/60">
          Para ejercer tus derechos, escribinos desde el email de tu cuenta.
        </p>
      </div>
    </article>
  );
}
