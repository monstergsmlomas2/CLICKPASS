'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Plus, Trash2, ImagePlus, X, Repeat } from 'lucide-react';
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

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Date → string para <input datetime-local> ("YYYY-MM-DDTHH:mm"), en hora local. */
function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
    coverUrl: '',
    venueName: '',
    venueAddress: '',
    city: '',
    country: 'Argentina',
    refundPolicy: 'STANDARD',
  });
  const [dates, setDates] = useState<DateRow[]>([emptyDate()]);
  const [uploadingField, setUploadingField] = useState<'bannerUrl' | 'coverUrl' | null>(null);
  const [rep, setRep] = useState({
    start: '',
    end: '',
    frequency: 'weekly',
    until: '',
    capacity: '',
    price: '',
  });

  /** Genera funciones repetidas (semanal/quincenal/mensual) hasta la fecha tope. */
  function generateRepeated() {
    setError(null);
    if (!rep.start || !rep.end || !rep.until || !rep.capacity || !rep.price) {
      setError('Para repetir, completá inicio, fin, cupo, precio y la fecha tope.');
      return;
    }
    const startD = new Date(rep.start);
    const endD = new Date(rep.end);
    const duration = endD.getTime() - startD.getTime();
    if (duration <= 0) {
      setError('El horario de fin debe ser posterior al de inicio.');
      return;
    }
    const untilD = new Date(`${rep.until}T23:59`);
    if (untilD < startD) {
      setError('La fecha tope debe ser posterior a la primera función.');
      return;
    }

    const rows: DateRow[] = [];
    let cur = new Date(startD);
    let guard = 0;
    while (cur <= untilD && guard < 200) {
      const e = new Date(cur.getTime() + duration);
      rows.push({
        startDate: toLocalInput(cur),
        endDate: toLocalInput(e),
        capacity: rep.capacity,
        price: rep.price,
        currency: 'ARS',
      });
      if (rep.frequency === 'monthly') {
        cur = new Date(cur);
        cur.setMonth(cur.getMonth() + 1);
      } else {
        cur = new Date(cur.getTime() + (rep.frequency === 'biweekly' ? 14 : 7) * 86400000);
      }
      guard += 1;
    }
    if (rows.length === 0) {
      setError('No se generó ninguna fecha. Revisá las fechas.');
      return;
    }
    // Suma las generadas a las funciones, descartando filas vacías iniciales.
    setDates((d) => [...d.filter((r) => r.startDate && r.endDate), ...rows]);
  }

  async function onPickImage(
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'bannerUrl' | 'coverUrl',
  ) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-elegir el mismo archivo
    if (!file) return;
    setError(null);
    setUploadingField(field);
    try {
      const url = await uploadEventImage(file);
      setForm((f) => ({ ...f, [field]: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la imagen');
    } finally {
      setUploadingField(null);
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
      const { bannerUrl, coverUrl, ...rest } = form;
      await api('/events', {
        method: 'POST',
        auth: true,
        body: {
          ...rest,
          ...(bannerUrl ? { bannerUrl } : {}),
          ...(coverUrl ? { coverUrl } : {}),
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

        <ImageUploader
          label="Imagen principal (para la grilla)"
          hint="Cuadrada o vertical (el flyer típico de Instagram). Si no subís ninguna, usamos una según la categoría."
          value={form.bannerUrl}
          uploading={uploadingField === 'bannerUrl'}
          onPick={(e) => onPickImage(e, 'bannerUrl')}
          onClear={() => setForm({ ...form, bannerUrl: '' })}
          previewClass="h-44"
        />
        <ImageUploader
          label="Imagen panorámica (opcional)"
          hint="Ancha/horizontal: se muestra grande arriba en la página del evento. Si no subís, se usa la principal."
          value={form.coverUrl}
          uploading={uploadingField === 'coverUrl'}
          onPick={(e) => onPickImage(e, 'coverUrl')}
          onClear={() => setForm({ ...form, coverUrl: '' })}
          previewClass="h-28"
        />
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
        <input
          className="field"
          placeholder="Dirección exacta (ej: Av. Corrientes 1234)"
          value={form.venueAddress}
          onChange={(e) => setForm({ ...form, venueAddress: e.target.value })}
        />

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

          <details className="mt-3 glass p-4">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-emerald">
              <Repeat size={15} /> ¿Se repite? Generar fechas automáticamente
            </summary>
            <p className="mt-3 text-xs text-muted">
              Para eventos recurrentes (ej. fiesta de todos los sábados). Genera todas las
              funciones hasta la fecha tope; después podés editar o borrar las que quieras.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-muted">Primera función — inicio</span>
                <input
                  type="datetime-local"
                  className="field mt-1"
                  value={rep.start}
                  onChange={(e) => setRep({ ...rep, start: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted">Primera función — fin</span>
                <input
                  type="datetime-local"
                  className="field mt-1"
                  value={rep.end}
                  onChange={(e) => setRep({ ...rep, end: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted">Frecuencia</span>
                <select
                  className="field mt-1 appearance-none"
                  value={rep.frequency}
                  onChange={(e) => setRep({ ...rep, frequency: e.target.value })}
                >
                  <option value="weekly">Cada semana</option>
                  <option value="biweekly">Cada 2 semanas</option>
                  <option value="monthly">Cada mes</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-muted">Repetir hasta</span>
                <input
                  type="date"
                  className="field mt-1"
                  value={rep.until}
                  onChange={(e) => setRep({ ...rep, until: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted">Cupo (cada fecha)</span>
                <input
                  type="number"
                  min={1}
                  className="field mt-1"
                  value={rep.capacity}
                  onChange={(e) => setRep({ ...rep, capacity: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted">Precio ARS (cada fecha)</span>
                <input
                  type="number"
                  min={0}
                  className="field mt-1"
                  value={rep.price}
                  onChange={(e) => setRep({ ...rep, price: e.target.value })}
                />
              </label>
            </div>
            <button
              type="button"
              onClick={generateRepeated}
              className="btn-outline mt-3 w-full text-sm !py-2"
            >
              Generar fechas
            </button>
          </details>

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

function ImageUploader({
  label,
  hint,
  value,
  uploading,
  onPick,
  onClear,
  previewClass,
}: {
  label: string;
  hint: string;
  value: string;
  uploading: boolean;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  previewClass: string;
}) {
  return (
    <div>
      <span className="font-mono text-xs uppercase tracking-widest text-muted">{label}</span>
      {value ? (
        <div className="relative mt-2 overflow-hidden rounded-xl border border-line">
          <Image src={value} alt={label} width={1200} height={480} className={`w-full object-cover ${previewClass}`} />
          <button
            type="button"
            onClick={onClear}
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
          <span className="text-sm">{uploading ? 'Subiendo…' : 'Subí una imagen (hasta 8 MB)'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={onPick} />
        </label>
      )}
      <p className="mt-1.5 text-xs text-muted">{hint}</p>
    </div>
  );
}
