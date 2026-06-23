'use client';

import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Reemplazo estilizado de window.confirm(), con el look de la plataforma. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/80 backdrop-blur-sm px-4">
      <div className="glass w-full max-w-sm animate-rise-in p-6 text-center">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            background: danger ? 'rgba(0,224,255,0.12)' : 'rgba(16,232,156,0.12)',
          }}
        >
          <AlertTriangle className={danger ? 'text-cyan' : 'text-emerald'} size={22} />
        </div>
        <h3 className="font-display text-xl font-semibold text-fg">{title}</h3>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <div className="mt-6 flex gap-3">
          <button onClick={onCancel} className="btn-outline flex-1 text-sm !py-2.5">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-xl text-sm font-semibold !py-2.5 transition-colors ${
              danger ? 'bg-cyan text-night hover:bg-cyan/90' : 'btn-neon'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
