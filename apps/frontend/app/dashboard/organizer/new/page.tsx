'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Plus, Trash2, ImagePlus, X } from 'lucide-react';
import { api } from '../../../../lib/api';
import { uploadEventImage } from '../../../../lib/cloudinary';

interface DateRow {
  startDate: string;
  endDate: string;
  capacity: string;
  price: string;
  currency: string;
}

const CATEGORIES = ['musica', 'teatro', 'deporte', 'festival', 'fiesta'];

function emptyDate(): DateRow {
  return { startDate: '', endDate: '', capacity: '', price: '', currency: 'ARS' };
}

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: CATEGORIES[0],
    bannerUrl: '',
    venueName: '',
    city: '',
    country: 'Argentina',
    refundPolicy: 'STANDARD',
  });
  const [dates, setDates] = useState<DateRow[]>([emptyDate()]);
  const [uploading, setUploading] = useState(false);

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-elegir el mismo archivo
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadEventImage(file);
      setForm((f) => ({ ...f, bannerUrl: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  }

  function updateDate(i: number, patch: Partial<DateRow>) {
    setDates((d) => d.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { bannerUrl, ...rest } = form;
      await api('/events', {
        method: 'POST',
        auth: true,
        body: {
          ...rest,
          ...(bannerUrl ? { bannerUrl } : {}),
          dates: dates.map((d) => ({
            startDate: new Date(d.startDate).toISOString(),
            endDate: new Date(d.endDate).toISOString(),
            capacity: Number(d.capacity),
            price: Number(d.price),
            currency: d.currency,
          })),
        },
      });
      router.push('/dashboard/organizer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el evento');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Link href="/dashboard/organizer" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-emerald transition-colors">
        <ArrowLeft size={16} /> Volver al panel
      </Link>

      <span className="mt-4 block font-mono text-xs uppercase tracking-widest text-emerald">Nuevo evento</span>
      <h1 className="mt-1 font-display text-4xl font-bold text-fg">Creá tu evento</h1>
      <p className="mt-2 text-sm text-muted">Se crea como borrador. Lo publicás cuando esté listo desde tu panel.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <input
          className="field"
          placeholder="Título del evento"
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          className="field min-h-24"
          placeholder="Descripción (opcional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-muted">
            Imagen del evento (opcional)
          </span>
          {form.bannerUrl ? (
            <div className="relative mt-2 overflow-hidden rounded-xl border border-line">
              <Image
                src={form.bannerUrl}
                alt="Banner del evento"
                width={1200}
                height={480}
                className="h-44 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setForm({ ...form, bannerUrl: '' })}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80"
                aria-label="Quitar imagen"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label
              className={`mt-2 flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line text-muted transition-colors hover:border-emerald/40 hover:text-emerald ${
                uploading ? 'pointer-events-none opacity-60' : ''
              }`}
            >
              <ImagePlus size={22} />
              <span className="text-sm">
                {uploading ? 'Subiendo…' : 'Subí una foto o banner (hasta 8 MB)'}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={onPickImage} />
            </label>
          )}
          <p className="mt-1.5 text-xs text-muted">
            Si no subís ninguna, usamos una imagen según la categoría.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select
            className="field appearance-none"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            className="field appearance-none"
            value={form.refundPolicy}
            onChange={(e) => setForm({ ...form, refundPolicy: e.target.value })}
          >
            <option value="STANDARD">Reembolso estándar (solo si se cancela)</option>
            <option value="FLEXIBLE">Flexible (hasta 24h antes)</option>
            <option value="NO_REFUND">Sin reembolsos voluntarios</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            className="field"
            placeholder="Sede (ej: Groove)"
            value={form.venueName}
            onChange={(e) => setForm({ ...form, venueName: e.target.value })}
          />
          <input
            className="field"
            placeholder="Ciudad"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-widest text-muted">Funciones</span>
            <button
              type="button"
              onClick={() => setDates((d) => [...d, emptyDate()])}
              className="flex items-center gap-1 text-xs font-medium text-emerald hover:underline"
            >
              <Plus size={14} /> Agregar función
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {dates.map((d, i) => (
              <div key={i} className="glass space-y-3 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs text-muted">Inicio</span>
                    <input
                      type="datetime-local"
                      required
                      className="field mt-1"
                      value={d.startDate}
                      onChange={(e) => updateDate(i, { startDate: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-muted">Fin</span>
                    <input
                      type="datetime-local"
                      required
                      className="field mt-1"
                      value={d.endDate}
                      onChange={(e) => updateDate(i, { endDate: e.target.value })}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
                  <label className="block">
                    <span className="text-xs text-muted">Capacidad</span>
                    <input
                      type="number"
                      min={1}
                      required
                      className="field mt-1"
                      value={d.capacity}
                      onChange={(e) => updateDate(i, { capacity: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-muted">Precio (ARS)</span>
                    <input
                      type="number"
                      min={0}
                      required
                      className="field mt-1"
                      value={d.price}
                      onChange={(e) => updateDate(i, { price: e.target.value })}
                    />
                  </label>
                  {dates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setDates((rows) => rows.filter((_, idx) => idx !== i))}
                      className="mt-6 flex h-11 w-11 items-center justify-center self-end rounded-xl border border-line text-muted hover:border-violet/40 hover:text-cyan transition-colors"
                      aria-label="Quitar función"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-violet/30 bg-violet/10 px-4 py-2 text-sm font-medium text-cyan">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-neon w-full text-base disabled:opacity-50">
          {loading ? 'Creando…' : 'Crear evento (borrador)'}
        </button>
      </form>
    </div>
  );
}
