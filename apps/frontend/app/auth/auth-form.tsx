'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, MessageCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/store';
import type { SessionUser } from '../../lib/types';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function AuthForm({
  mode,
  defaultOrganizer = false,
}: {
  mode: 'login' | 'register';
  defaultOrganizer?: boolean;
}) {
  const router = useRouter();
  const setSession = useAuth((s) => s.setSession);
  const sessionUser = useAuth((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOrganizer, setIsOrganizer] = useState(defaultOrganizer);

  // Si ya hay sesión, no tiene sentido mostrar login/registro: al panel correspondiente.
  useEffect(() => {
    if (sessionUser) {
      router.replace(
        sessionUser.role === 'ORGANIZER' || sessionUser.role === 'ADMIN'
          ? '/dashboard/organizer'
          : '/dashboard/user',
      );
    }
  }, [sessionUser, router]);
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
  });

  const isRegister = mode === 'register';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isRegister && !isValidPhone(form.phone)) {
      setError('Ingresá un número de WhatsApp válido, con código de área (mínimo 10 dígitos).');
      return;
    }
    setLoading(true);
    try {
      const path = isRegister ? '/auth/register' : '/auth/login';
      const body = isRegister
        ? { ...form, role: isOrganizer ? 'ORGANIZER' : 'USER' }
        : { email: form.email, password: form.password };
      const res = await api<AuthResponse>(path, { method: 'POST', body });
      setSession(res);
      router.push(
        res.user.role === 'ORGANIZER' || res.user.role === 'ADMIN'
          ? '/dashboard/organizer'
          : '/dashboard/user',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo salió mal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="glass animate-rise-in p-8">
        <span className="font-mono text-xs uppercase tracking-widest text-emerald">
          {isRegister ? 'Nueva cuenta' : 'Bienvenido de vuelta'}
        </span>
        <h1 className="mt-1 font-display text-4xl font-bold text-fg">
          {isRegister
            ? isOrganizer
              ? 'Vendé con Clickpass'
              : 'Sumate a Clickpass'
            : 'Ingresá'}
        </h1>

        {isRegister && (
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-line p-1">
            <button
              type="button"
              onClick={() => setIsOrganizer(false)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                !isOrganizer ? 'bg-lime/15 text-lime' : 'text-muted hover:text-fg'
              }`}
            >
              Quiero comprar
            </button>
            <button
              type="button"
              onClick={() => setIsOrganizer(true)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isOrganizer ? 'bg-lime/15 text-lime' : 'text-muted hover:text-fg'
              }`}
            >
              Vender eventos
            </button>
          </div>
        )}
        {isRegister && isOrganizer && (
          <p className="mt-3 text-xs text-muted">
            Publicá y vendé tus entradas. Gratis los primeros 3 meses, después 5% por entrada.
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {isRegister && (
            <div className="grid grid-cols-2 gap-3">
              <input
                className="field"
                placeholder="Nombre"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
              <input
                className="field"
                placeholder="Apellido"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
          )}
          {isRegister && (
            <div>
              <input
                className="field"
                type="tel"
                placeholder="WhatsApp (ej: +54 9 11 1234-5678)"
                required
                pattern="[0-9+\-\s()]{8,20}"
                title="Ingresá un número de WhatsApp válido, con código de área"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <p className="mt-1.5 flex items-center gap-1 text-xs text-muted">
                <MessageCircle size={12} className="text-emerald" /> Te avisamos por ahí si hay novedades con tu compra.
              </p>
            </div>
          )}
          <input
            className="field"
            type="email"
            placeholder="tu@email.com"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="field"
            type="password"
            placeholder="Contraseña (mín. 8)"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          {error && (
            <p className="rounded-xl border border-violet/30 bg-violet/10 px-4 py-2 text-sm font-medium text-cyan">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-neon w-full text-base disabled:opacity-50">
            {loading ? 'Procesando…' : isRegister ? 'Crear cuenta' : 'Entrar'}
          </button>
        </form>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted">
          <ShieldCheck size={14} className="text-emerald" /> Pago protegido · Reembolso garantizado en 48h
        </p>

        <div className="divider my-6" />

        <p className="text-center text-sm text-muted">
          {isRegister ? (
            <>
              ¿Ya tenés cuenta?{' '}
              <Link href="/auth/login" className="font-medium text-lime hover:underline">
                Ingresá
              </Link>
            </>
          ) : (
            <>
              ¿Primera vez?{' '}
              <Link href="/auth/register" className="font-medium text-lime hover:underline">
                Creá tu cuenta
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
