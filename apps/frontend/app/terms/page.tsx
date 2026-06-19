import { ScrollText } from 'lucide-react';

export const metadata = { title: 'Términos y Condiciones — Clickpass' };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-16">
      <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-emerald">
        <ScrollText size={14} /> Legales
      </span>
      <h1 className="mt-1 font-display text-4xl font-bold text-fg">Términos y Condiciones</h1>
      <div className="mt-8 space-y-6 text-muted">
        <Section title="1. Responsabilidad de Clickpass">
          Clickpass actúa como intermediario tecnológico. No es responsable por la cancelación
          del evento por parte del organizador. Se compromete a procesar reembolsos en 48 horas
          hábiles desde la solicitud del organizador.
        </Section>
        <Section title="2. Política de reembolsos">
          Si el organizador cancela, el reembolso se procesa en 48h hábiles. El dinero del precio
          de la entrada proviene del pago original; Clickpass no se hace cargo de devoluciones de
          terceros. Los reembolsos voluntarios dependen de la política del organizador.
        </Section>
        <Section title={'3. Garantía "48h o bono"'}>
          Si Clickpass no completa un reembolso en 48h hábiles por causas atribuibles a Clickpass,
          el usuario recibe un bono compensatorio (crédito para futuras compras, con un tope por
          transacción). No aplica cuando la demora se origina en la red de pagos.
        </Section>
        <Section title="4. Entradas">
          La entrada es personal e intransferible salvo que el organizador permita la reventa. El
          QR debe presentarse en el evento.
        </Section>
      </div>
      <p className="mt-10 text-xs text-muted/60">
        Clickpass no es responsable por el contenido del evento.
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl text-fg">{title}</h2>
      <p className="mt-2 leading-relaxed">{children}</p>
    </section>
  );
}
