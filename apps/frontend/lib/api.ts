import { API_URL } from './config';
import { useAuth } from './store';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
}

// Un único refresh en vuelo a la vez: si varias requests reciben 401 juntas, comparten
// la misma promesa para no rotar el refresh token en paralelo (que invalidaría a las demás).
let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const refreshToken = useAuth.getState().refreshToken;
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const data = await res.json();
    useAuth.getState().setSession(data);
    return true;
  } catch {
    return false;
  }
}

function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** Cliente HTTP del frontend. Adjunta el access token cuando `auth` es true. */
export async function api<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const send = async (): Promise<Response> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...opts.headers,
    };
    if (opts.auth) {
      const token = useAuth.getState().accessToken;
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return fetch(`${API_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store',
    });
  };

  let res = await send();

  // Token de acceso vencido: intentar renovarlo con el refresh token y reintentar 1 vez.
  if (res.status === 401 && opts.auth) {
    const ok = await refreshSession();
    if (ok) {
      res = await send();
    } else {
      // El refresh también venció: cerrar sesión para forzar un login limpio.
      useAuth.getState().logout();
    }
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) || `Error ${res.status}`;
    throw new ApiError(res.status, Array.isArray(message) ? message.join(', ') : message);
  }
  return data as T;
}

/** Para Server Components: fetch público sin token. */
export async function apiPublic<T = unknown>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
