'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Beer } from 'lucide-react';
import type { EventItem, Product } from '../lib/types';
import { api } from '../lib/api';
import { useAuth } from '../lib/store';
import { formatMoney, formatDate } from '../lib/format';

type Stage = 'select' | 'pay' | 'done';

export function BuyBox({ event, products = [] }: { event: EventItem; products?: Product[] }) {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const activeDates = event.dates.filter((d) => d.status !== 'CANCELLED');
  const [dateId, setDateId] = useState(activeDates[0]?.id ?? '');
  const [qty, setQty] = useState(1);
  const [itemQty, setItemQty] = useState<Record<string, number>>({});
  const [stage, setStage] = useState<Stage>('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [checkout, setCheckout] = useState<{
    paymentId: string;
    initPoint: string;
    simulated: boolean;
    amount: string;
  } | null>(null);

  const selectedItems = products
    .map((p) => ({ product: p, quantity: itemQty[p.id] ?? 0 }))
    .filter((i) => i.quantity > 0);
  const addOnsSubtotal = selectedItems.reduce(
    (acc, i) => acc + Number(i.product.price) * i.quantity,
    0,
  );

  function setProductQty(id: string, value: number) {
    setItemQty((q) => ({ ...q, [id]: Math.max(0, value) }));
  }

  const selected = activeDates.find((d) => d.id === dateId);
  const remaining = selected ? selected.capacity - selected.ticketsSold : 0;
  const soldOut = !selected || selected.status === 'SOLD_OUT' || remaining <= 0;

  async function startCheckout() {
    if (!user && (!guestName.trim() || !guestEmail.trim())) {
      setError('Ingresá tu nombre y email para comprar');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const guestFields = user
        ? {}
        : { guestName: guestName.trim(), guestEmail: guestEmail.trim(), guestPhone: guestPhone.trim() || undefined };
      const reservationKey = crypto.randomUUID();
      const items = selectedItems.map((i) => ({ productId: i.product.id, quantity: i.quantity }));
      await api('/tickets/reserve', {
        method: 'POST',
        auth: true,
        headers: { 'Idempotency-Key': reservationKey },
        body: { eventDateId: dateId, quantity: qty, ...(items.length ? { items } : {}), ...guestFields },
      });
      const res = await api<{
        paymentId: string;
        initPoint: string;
        simulated: boolean;
        amount: string;
      }>('/payments/checkout', {
        method: 'POST',
        auth: true,
        body: { eventDateId: dateId, quantity: qty, reservationKey, ...guestFields },
      });
      setCheckout(res);
      setStage('pay');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar la compra');
    } finally {
      setLoading(false);
    }
  }

  async function pay() {
    if (!checkout) return;
    setLoading(true);
    setError(null);
    try {
      if (checkout.simulated) {
        await api('/payments/_simulate', {
          method: 'POST',
          auth: true,
          body: { reference: checkout.paymentId, status: 'approved' },
        });
        setStage('done');
      } else {
        window.location.href = checkout.initPoint;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar el pago');
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="glass sticky top-28 p-6">
      {stage === 'done' ? (
        <div className="text-center animate-rise-in">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background: 'linear-gradient(135deg, #9D4EFF, #10E89C)',
              boxShadow: '0 0 30px rgba(16,232,156,0.4)',
            }}
          >
            <span className="text-2xl text-night font-bold">✓</span>
          </div>
          <h3 className="font-display text-2xl text-fg" style={{ fontWeight: 400 }}>¡Compra confirmada!</h3>
          <p className="mt-2 text-sm text-muted">
            {user
              ? 'Te enviamos el QR por email. También está en tus entradas.'
              : `Te enviamos las entradas con el QR a ${guestEmail}. Guardá ese email, es tu comprobante.`}
          </p>
          {user && (
            <button onClick={() => router.push('/dashboard/user')} className="btn-neon mt-6 w-full text-base">
              Ver mis entradas
            </button>
          )}
        </div>
      ) : stage === 'pay' && checkout ? (
        <div className="animate-rise-in">
          <span className="font-mono text-xs uppercase tracking-widest text-lime">Casi listo</span>
          <h3 className="mt-1 font-display text-2xl text-fg" style={{ fontWeight: 400 }}>Confirmá tu pago</h3>
          <dl className="mt-5 space-y-2 font-mono text-sm">
            <Row label="Entradas" value={`${qty}`} />
            {selectedItems.map((i) => (
              <Row key={i.product.id} label={i.product.name} value={`x${i.quantity}`} />
            ))}
            {Number(checkout.amount) > 0 && (
              <>
                <Row label="Subtotal" value={formatMoney(Number(checkout.amount) / 1.15)} />
                <Row label="Costo por servicio (15%)" value={formatMoney(Number(checkout.amount) - Number(checkout.amount) / 1.15)} />
              </>
            )}
            <Row label="Total" value={Number(checkout.amount) > 0 ? formatMoney(checkout.amount) : 'Gratis'} strong />
          </dl>
          {checkout.simulated && (
            <p className="mt-4 rounded-xl border border-line bg-surface/50 px-3 py-2 text-xs text-muted">
              Modo demo: MercadoPago está simulado. Al pagar se aprueba automáticamente.
            </p>
          )}
          {error && <ErrorBox msg={error} />}
          <button onClick={pay} disabled={loading} className="btn-neon mt-5 w-full text-base disabled:opacity-50">
            {loading ? 'Procesando…' : `Pagar ${formatMoney(checkout.amount)}`}
          </button>
          <button onClick={() => setStage('select')} className="mt-3 w-full text-sm text-muted hover:text-lime transition-colors">
            Volver
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-xs uppercase tracking-widest text-muted">Precio</span>
            <span className="font-mono text-2xl font-bold text-lime">
              {selected ? (Number(selected.price) > 0 ? formatMoney(selected.price) : 'Gratis') : '—'}
            </span>
          </div>
          {selected && Number(selected.price) > 0 && (
            <p className="mt-1 text-right text-xs text-muted">+ 15% costo por servicio</p>
          )}

          <label className="mt-5 block font-mono text-xs uppercase tracking-widest text-muted">Fecha</label>
          <select
            className="field mt-1.5 appearance-none"
            value={dateId}
            onChange={(e) => {
              setDateId(e.target.value);
              setQty(1);
            }}
          >
            {activeDates.map((d) => (
              <option key={d.id} value={d.id}>
                {formatDate(d.startDate)}
              </option>
            ))}
          </select>

          <label className="mt-4 block font-mono text-xs uppercase tracking-widest text-muted">Cantidad</label>
          <div className="mt-1.5 flex items-center gap-3">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-lg text-fg hover:bg-lime/10 hover:border-lime/30 transition-all"
            >
              −
            </button>
            <span className="w-10 text-center font-mono text-xl font-bold text-fg">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(remaining || 1, q + 1, 6))}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-lg text-fg hover:bg-lime/10 hover:border-lime/30 transition-all"
            >
              +
            </button>
            <span className="ml-auto text-xs text-muted">
              {remaining > 0 ? `${remaining} disponibles` : 'Agotado'}
            </span>
          </div>

          {products.length > 0 && (
            <div className="mt-5 rounded-2xl border border-emerald/30 bg-emerald/5 p-4">
              <p className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-emerald">
                <Beer size={14} /> Consumiciones
              </p>
              <div className="mt-3 space-y-2">
                {products.map((p) => {
                  const left = p.stock != null ? p.stock - p.sold : null;
                  const out = left != null && left <= 0;
                  const q = itemQty[p.id] ?? 0;
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface/60 px-3 py-2">
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line">
                            <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line text-muted">
                            <Beer size={16} />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-fg">{p.name}</p>
                          <p className="font-mono text-xs text-emerald">{formatMoney(p.price)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setProductQty(p.id, q - 1)}
                          disabled={q <= 0}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-fg hover:bg-lime/10 disabled:opacity-30"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-mono text-sm text-fg">{q}</span>
                        <button
                          onClick={() => setProductQty(p.id, q + 1)}
                          disabled={out || (left != null && q >= left)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-fg hover:bg-lime/10 disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {addOnsSubtotal > 0 && (
                <p className="mt-2 text-right text-xs text-muted">
                  Consumiciones: {formatMoney(addOnsSubtotal)} + 15% costo por servicio
                </p>
              )}
            </div>
          )}

          {!user && (
            <div className="mt-5 space-y-2.5">
              <label className="block font-mono text-xs uppercase tracking-widest text-muted">
                Tus datos para recibir la entrada
              </label>
              <input
                type="text"
                placeholder="Nombre y apellido"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="field"
              />
              <input
                type="email"
                placeholder="Email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="field"
              />
              <input
                type="tel"
                placeholder="Teléfono (opcional)"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="field"
              />
            </div>
          )}

          {error && <ErrorBox msg={error} />}

          <button
            onClick={startCheckout}
            disabled={loading || soldOut}
            className="btn-neon mt-6 w-full text-base disabled:opacity-50"
          >
            {soldOut ? 'Agotado' : loading ? 'Reservando…' : 'Comprar'}
          </button>
        </div>
      )}
    </aside>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className={strong ? 'text-lg font-bold text-lime' : 'text-fg'}>{value}</dd>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <p className="mt-4 rounded-xl border border-violet/30 bg-violet/10 px-3 py-2 text-sm font-medium text-cyan">
      {msg}
    </p>
  );
}
