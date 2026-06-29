'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Ticket } from 'lucide-react';
import { Logo } from './logo';
import { useAuth } from '../lib/store';

export function Nav() {
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMounted(true), []);

  // El destino de "Organizadores" depende de la sesión: invitado → registro como
  // organizador; comprador → su panel (ahí está "Convertite en organizador");
  // organizador/admin → su panel.
  const organizerHref =
    mounted && user
      ? user.role === 'ORGANIZER' || user.role === 'ADMIN'
        ? '/dashboard/organizer'
        : '/dashboard/user'
      : '/auth/register?type=organizer';

  return (
    <header className="sticky top-0 z-50 glass rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Logo />

        {/* Nav desktop */}
        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          <Link href="/events/search" className="text-muted hover:text-lime transition-colors">
            Explorar
          </Link>
          <Link href="/migrate-from-passline" className="text-muted hover:text-lime transition-colors">
            Vengo de Passline
          </Link>
          <Link href="/#garantia" className="text-muted hover:text-lime transition-colors">
            Garantía 48h
          </Link>
          <Link href={organizerHref} className="text-muted hover:text-lime transition-colors">
            Organizadores
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {mounted && user ? (
            <>
              {user.role === 'ORGANIZER' || user.role === 'ADMIN' ? (
                <Link
                  href="/dashboard/organizer"
                  className="hidden text-sm font-medium text-muted hover:text-lime transition-colors sm:inline"
                >
                  Hola, {user.firstName}
                </Link>
              ) : (
                <Link
                  href="/dashboard/user"
                  className="hidden items-center gap-1.5 text-sm font-medium text-muted hover:text-lime transition-colors sm:inline-flex"
                >
                  <Ticket size={15} /> Mis entradas
                </Link>
              )}
              <button
                onClick={logout}
                className="btn-outline text-sm !px-4 !py-1.5"
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="hidden text-sm font-medium text-muted hover:text-lime transition-colors sm:inline"
              >
                Ingresar
              </Link>
              <Link
                href="/auth/register"
                className="btn-neon text-sm !px-4 !py-1.5"
              >
                Crear cuenta
              </Link>
            </>
          )}

          {/* Hamburger mobile */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex flex-col gap-1 md:hidden"
            aria-label="Menú"
          >
            <span className={`block h-0.5 w-5 bg-fg transition-transform ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
            <span className={`block h-0.5 w-5 bg-fg transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-5 bg-fg transition-transform ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-line px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {mounted && user && (
              <Link
                href={user.role === 'ORGANIZER' || user.role === 'ADMIN' ? '/dashboard/organizer' : '/dashboard/user'}
                className="flex items-center gap-1.5 font-medium text-lime"
                onClick={() => setMenuOpen(false)}
              >
                <Ticket size={16} />{' '}
                {user.role === 'ORGANIZER' || user.role === 'ADMIN' ? 'Mi panel' : 'Mis entradas'}
              </Link>
            )}
            <Link href="/events/search" className="text-muted hover:text-lime" onClick={() => setMenuOpen(false)}>
              Explorar
            </Link>
            <Link href="/migrate-from-passline" className="text-muted hover:text-lime" onClick={() => setMenuOpen(false)}>
              Vengo de Passline
            </Link>
            <Link href="/#garantia" className="text-muted hover:text-lime" onClick={() => setMenuOpen(false)}>
              Garantía 48h
            </Link>
            <Link href={organizerHref} className="text-muted hover:text-lime" onClick={() => setMenuOpen(false)}>
              Organizadores
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
