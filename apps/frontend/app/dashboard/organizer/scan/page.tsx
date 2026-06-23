'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ScanLine, CheckCircle2, XCircle, Camera, Keyboard } from 'lucide-react';
import { api, ApiError } from '../../../../lib/api';
import { useAuth } from '../../../../lib/store';

/** Recorte cuadrado de hasta el 70% del lado más chico del visor, para que la caja
 * de escaneo siempre entre en pantalla sin importar el tamaño de cámara del celular. */
function qrboxSize(viewfinderWidth: number, viewfinderHeight: number) {
  const min = Math.min(viewfinderWidth, viewfinderHeight);
  const size = Math.floor(min * 0.7);
  return { width: size, height: size };
}

/** Elige la cámara trasera por nombre cuando hay varias; si no se puede listar
 * (permiso no otorgado todavía), se delega en facingMode "environment". */
async function pickBackCameraId(Html5Qrcode: typeof import('html5-qrcode').Html5Qrcode): Promise<string | null> {
  try {
    const cameras = await Html5Qrcode.getCameras();
    if (!cameras.length) return null;
    const back = cameras.find((c) => /back|tras|rear|environment/i.test(c.label));
    return (back ?? cameras[cameras.length - 1]).id;
  } catch {
    return null;
  }
}

type Result =
  | { kind: 'ok'; eventTitle: string; usedAt: string; attendeeName: string | null; attendeeEmail: string | null }
  | { kind: 'error'; message: string };

function extractQrCode(rawText: string): string {
  // El QR codifica una URL "https://.../checkin/<code>" — nos quedamos solo con <code>.
  const parts = rawText.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? rawText;
}

export default function OrganizerScanPage() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null);
  const busyRef = useRef(false);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [validating, setValidating] = useState(false);

  const canValidate = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  const handleDecoded = useCallback(async (rawText: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    const qrCode = extractQrCode(rawText);
    try {
      const res = await api<{
        ok: boolean;
        eventTitle: string;
        usedAt: string;
        attendeeName: string | null;
        attendeeEmail: string | null;
      }>('/tickets/check-in', { method: 'POST', auth: true, body: { qrCode } });
      setResult({
        kind: 'ok',
        eventTitle: res.eventTitle,
        usedAt: res.usedAt,
        attendeeName: res.attendeeName,
        attendeeEmail: res.attendeeEmail,
      });
    } catch (err) {
      setResult({
        kind: 'error',
        message: err instanceof ApiError ? err.message : 'No se pudo validar la entrada',
      });
    }
  }, []);

  useEffect(() => {
    if (!accessToken) {
      router.push('/auth/login');
      return;
    }
  }, [accessToken, router]);

  useEffect(() => {
    if (!canValidate || result) return;
    let instance: import('html5-qrcode').Html5Qrcode | null = null;
    let cancelled = false;

    import('html5-qrcode').then(async ({ Html5Qrcode }) => {
      if (cancelled || !containerRef.current) return;
      instance = new Html5Qrcode(containerRef.current.id);
      scannerRef.current = instance;
      const backCameraId = await pickBackCameraId(Html5Qrcode);
      if (cancelled) return;
      try {
        await instance.start(
          backCameraId ?? { facingMode: 'environment' },
          { fps: 10, qrbox: qrboxSize, aspectRatio: 1 },
          (decodedText) => handleDecoded(decodedText),
          () => {},
        );
        setScanning(true);
      } catch {
        setCameraError('No se pudo acceder a la cámara. Revisá los permisos del navegador.');
      }
    });

    return () => {
      cancelled = true;
      if (instance) {
        instance.stop().catch(() => {});
      }
    };
  }, [canValidate, result, handleDecoded]);

  function scanNext() {
    busyRef.current = false;
    setManualCode('');
    setManualOpen(false);
    setResult(null);
  }

  async function validateManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualCode.trim() || validating) return;
    setValidating(true);
    try {
      await handleDecoded(manualCode.trim());
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center px-4 py-16 text-center">
      <Link href="/dashboard/organizer" className="self-start inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-emerald transition-colors">
        <ArrowLeft size={16} /> Volver al panel
      </Link>

      <div
        className="mt-5 mb-5 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: 'linear-gradient(135deg, #9D4EFF, #10E89C)', boxShadow: '0 0 30px rgba(16,232,156,0.3)' }}
      >
        <Camera className="text-night" size={28} />
      </div>
      <span className="font-mono text-xs uppercase tracking-widest text-emerald">Control de acceso</span>
      <h1 className="mt-1 font-display text-3xl font-bold text-fg">Escanear entradas</h1>

      {!user ? (
        <div className="glass mt-6 w-full p-6">
          <p className="text-sm text-muted">Necesitás iniciar sesión como organizador para escanear entradas.</p>
          <Link href="/auth/login" className="btn-neon mt-4 inline-flex">Ingresar</Link>
        </div>
      ) : !canValidate ? (
        <div className="glass mt-6 w-full p-6">
          <p className="text-sm text-muted">Tu cuenta no tiene permisos de organizador para escanear entradas.</p>
        </div>
      ) : result?.kind === 'ok' ? (
        <div className="glass mt-6 w-full animate-rise-in p-6">
          <CheckCircle2 className="mx-auto text-emerald" size={40} />
          <h2 className="mt-3 font-display text-xl font-semibold text-fg">¡Entrada válida!</h2>
          <p className="mt-1 text-sm text-muted">{result.eventTitle}</p>
          {(result.attendeeName || result.attendeeEmail) && (
            <div className="mt-3 rounded-xl border border-line bg-surface/60 px-4 py-3 text-left">
              <p className="font-mono text-[10px] uppercase tracking-widest text-emerald">Comprador</p>
              {result.attendeeName && <p className="mt-1 text-sm font-medium text-fg">{result.attendeeName}</p>}
              {result.attendeeEmail && <p className="font-mono text-xs text-muted">{result.attendeeEmail}</p>}
            </div>
          )}
          <p className="mt-3 font-mono text-xs text-muted">
            Marcada como usada {new Date(result.usedAt).toLocaleString('es-AR')}
          </p>
          <button onClick={scanNext} className="btn-neon mt-5 w-full text-sm">
            <ScanLine size={14} /> Escanear siguiente
          </button>
        </div>
      ) : result?.kind === 'error' ? (
        <div className="glass mt-6 w-full animate-rise-in p-6">
          <XCircle className="mx-auto text-cyan" size={40} />
          <p className="mt-3 text-sm font-medium text-cyan">{result.message}</p>
          <button onClick={scanNext} className="btn-outline mt-5 w-full text-sm">
            Escanear siguiente
          </button>
        </div>
      ) : (
        <div className="glass mt-6 w-full p-4">
          {cameraError ? (
            <p className="px-2 py-10 text-sm text-cyan">{cameraError}</p>
          ) : (
            <>
              <div id="organizer-qr-reader" ref={containerRef} className="overflow-hidden rounded-xl" />
              <p className="mt-3 font-mono text-xs text-muted">
                {scanning ? 'Apuntá la cámara al QR de la entrada' : 'Iniciando cámara…'}
              </p>
            </>
          )}

          {!manualOpen ? (
            <button
              onClick={() => setManualOpen(true)}
              className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm font-medium text-muted hover:text-emerald transition-colors"
            >
              <Keyboard size={14} /> ¿No lee el QR? Ingresar código a mano
            </button>
          ) : (
            <form onSubmit={validateManual} className="mt-4 space-y-2">
              <input
                className="field text-center font-mono text-sm"
                placeholder="Código de la entrada"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                autoFocus
              />
              <button type="submit" disabled={validating || !manualCode.trim()} className="btn-neon w-full text-sm disabled:opacity-50">
                {validating ? 'Validando…' : 'Validar código'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
