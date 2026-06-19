'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ScanLine, CheckCircle2, XCircle } from 'lucide-react';
import { api, ApiError } from '../../../lib/api';
import { useAuth } from '../../../lib/store';

type Result =
  | { kind: 'ok'; eventTitle: string; usedAt: string }
  | { kind: 'error'; message: string };

export default function CheckInPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const canValidate = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  async function validate() {
    setLoading(true);
    setResult(null);
    try {
      const res = await api<{ ok: boolean; eventTitle: string; usedAt: string }>(
        '/tickets/check-in',
        { method: 'POST', auth: true, body: { qrCode: code } },
      );
      setResult({ kind: 'ok', eventTitle: res.eventTitle, usedAt: res.usedAt });
    } catch (err) {
      setResult({
        kind: 'error',
        message: err instanceof ApiError ? err.message : 'No se pudo validar la entrada',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: 'linear-gradient(135deg, #9D4EFF, #10E89C)', boxShadow: '0 0 30px rgba(16,232,156,0.3)' }}
      >
        <ScanLine className="text-night" size={28} />
      </div>
      <span className="font-mono text-xs uppercase tracking-widest text-emerald">Control de acceso</span>
      <h1 className="mt-1 font-display text-3xl font-bold text-fg">Validar entrada</h1>

      {!user ? (
        <div className="glass mt-6 w-full p-6">
          <p className="text-sm text-muted">Necesitás iniciar sesión como organizador para validar esta entrada.</p>
          <Link href="/auth/login" className="btn-neon mt-4 inline-flex">Ingresar</Link>
        </div>
      ) : !canValidate ? (
        <div className="glass mt-6 w-full p-6">
          <p className="text-sm text-muted">Tu cuenta no tiene permisos de organizador para validar entradas.</p>
        </div>
      ) : result?.kind === 'ok' ? (
        <div className="glass mt-6 w-full animate-rise-in p-6">
          <CheckCircle2 className="mx-auto text-emerald" size={40} />
          <h2 className="mt-3 font-display text-xl font-semibold text-fg">¡Entrada válida!</h2>
          <p className="mt-1 text-sm text-muted">{result.eventTitle}</p>
          <p className="mt-1 font-mono text-xs text-muted">
            Marcada como usada {new Date(result.usedAt).toLocaleString('es-AR')}
          </p>
          <button onClick={() => router.refresh()} className="btn-outline mt-5 w-full text-sm">
            Validar otra
          </button>
        </div>
      ) : (
        <div className="glass mt-6 w-full p-6">
          {result?.kind === 'error' && (
            <p className="mb-4 flex items-center justify-center gap-1.5 text-sm font-medium text-cyan">
              <XCircle size={16} /> {result.message}
            </p>
          )}
          <p className="break-all font-mono text-xs text-muted">{code}</p>
          <button onClick={validate} disabled={loading} className="btn-neon mt-5 w-full text-base disabled:opacity-50">
            {loading ? 'Validando…' : 'Validar entrada'}
          </button>
        </div>
      )}
    </div>
  );
}
