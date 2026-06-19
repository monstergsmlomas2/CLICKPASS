'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Download, Upload, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../../../../lib/api';

interface ImportRow {
  line: number;
  valid: boolean;
  errors: string[];
  title?: string;
  category?: string;
  city?: string;
  startDate?: string;
  capacity?: number;
  price?: number;
  currency?: string;
}

const TEMPLATE =
  'title,category,city,venueName,country,refundPolicy,startDate,endDate,capacity,price,currency\n' +
  'Mi evento de ejemplo,musica,Buenos Aires,Mi Sede,Argentina,STANDARD,2026-12-01T22:00:00.000Z,2026-12-02T02:00:00.000Z,200,10000,ARS\n';

function downloadTemplate() {
  const blob = new Blob([TEMPLATE], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'clickpass-plantilla-eventos.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportWizardPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  const validCount = rows?.filter((r) => r.valid).length ?? 0;

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const csv = reader.result as string;
      setLoading(true);
      try {
        const preview = await api<ImportRow[]>('/events/import/preview', {
          method: 'POST',
          auth: true,
          body: { csv },
        });
        setRows(preview);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo leer el archivo');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  }

  async function confirm() {
    if (!rows) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ created: number; skipped: number }>('/events/import/confirm', {
        method: 'POST',
        auth: true,
        body: { rows },
      });
      setResult(res);
      setRows(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar la importación');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <span className="chip flex w-fit items-center gap-1.5 text-cyan border-cyan/30">
        <ShieldCheck size={14} /> Importación segura · sin contraseñas de terceros
      </span>
      <h1 className="mt-5 font-display text-4xl font-bold text-fg">Importar eventos por CSV</h1>
      <p className="mt-4 max-w-xl text-muted">
        Nunca te pedimos tu usuario ni clave de otra plataforma. Vos aportás tu archivo, y
        nosotros hacemos el resto.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <button onClick={downloadTemplate} className="btn-outline flex items-center gap-1.5 text-sm">
          <Download size={16} /> Descargar plantilla
        </button>
        <button onClick={() => fileRef.current?.click()} className="btn-neon flex items-center gap-1.5 text-sm">
          <Upload size={16} /> Subir CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv" onChange={onFile} className="hidden" />
      </div>

      {loading && <p className="mt-6 font-mono text-sm text-muted">Procesando…</p>}

      {error && (
        <p className="mt-6 rounded-xl border border-violet/30 bg-violet/10 px-4 py-2 text-sm font-medium text-cyan">
          {error}
        </p>
      )}

      {result && (
        <div className="glass mt-8 p-6 text-center">
          <CheckCircle2 className="mx-auto text-emerald" size={36} />
          <h2 className="mt-2 font-display text-xl font-semibold text-fg">
            {result.created} evento{result.created !== 1 ? 's' : ''} creado{result.created !== 1 ? 's' : ''}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {result.skipped > 0 ? `${result.skipped} fila(s) se saltearon por errores. ` : ''}
            Quedaron como borrador en tu panel, listos para publicar.
          </p>
          <Link href="/dashboard/organizer" className="btn-neon mt-4 inline-flex">Ver mi panel</Link>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-widest text-muted">
              Previsualización: {validCount}/{rows.length} válidas
            </span>
            <button
              onClick={confirm}
              disabled={loading || validCount === 0}
              className="btn-neon text-sm !px-5 !py-2 disabled:opacity-50"
            >
              Confirmar importación
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {rows.map((r) => (
              <div
                key={r.line}
                className={`glass flex items-start gap-3 p-4 ${r.valid ? '' : 'border-cyan/30'}`}
              >
                {r.valid ? (
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald" />
                ) : (
                  <XCircle size={18} className="mt-0.5 shrink-0 text-cyan" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-fg">
                    Línea {r.line}: {r.title || '(sin título)'}
                  </p>
                  {r.valid ? (
                    <p className="text-sm text-muted">
                      {r.category} · {r.city ?? 'sin ciudad'} · {r.capacity} cupos · ${r.price}
                    </p>
                  ) : (
                    <p className="text-sm text-cyan">{r.errors.join(' · ')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ol className="mt-12 grid gap-4 sm:grid-cols-2">
        {[
          ['1', 'Descargá la plantilla', 'O usá tu export de Passline/Eventbrite con las mismas columnas.'],
          ['2', 'Subí tu CSV', 'Validamos fila por fila antes de crear nada.'],
          ['3', 'Previsualizá', 'Verde se crea, celeste se corrige.'],
          ['4', 'Confirmá', 'Tus eventos quedan en borrador, listos para publicar.'],
        ].map(([n, t, d]) => (
          <li key={n} className="glass flex gap-4 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold text-emerald border border-emerald/30">
              {n}
            </span>
            <div>
              <h3 className="font-medium text-fg">{t}</h3>
              <p className="text-sm text-muted">{d}</p>
            </div>
          </li>
        ))}
      </ol>

      <Link href="/dashboard/organizer" className="btn-outline mt-10 text-sm">
        ← Volver al panel
      </Link>
    </div>
  );
}
