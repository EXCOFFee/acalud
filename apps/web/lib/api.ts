// Cliente HTTP de la API. En producción, las llamadas son relativas (`/api/v1/...`) y el
// rewrite de Vercel las lleva a Render (same-site) → la cookie httpOnly viaja sola (ADR-004).
// Para dev local se puede apuntar a otra base con NEXT_PUBLIC_API_BASE.
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

export interface ProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
  trace_id?: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problema: ProblemDetails,
  ) {
    super(problema.detail ?? problema.title ?? `Error ${status}`);
    this.name = 'ApiError';
  }
}

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const init: RequestInit = { method: metodo, credentials: 'include' };
  if (cuerpo !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(cuerpo);
  }

  const res = await fetch(`${BASE}/api/v1${ruta}`, init);
  if (!res.ok) {
    let problema: ProblemDetails = {};
    try {
      problema = (await res.json()) as ProblemDetails;
    } catch {
      /* respuesta sin cuerpo */
    }
    throw new ApiError(res.status, problema);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface PerfilPropio {
  nombre: string;
  apellido: string;
  email: string;
  estado: string;
  capacidades_limitadas: boolean;
}

export const api = {
  registro: (d: { email: string; contrasena: string; nombre: string; apellido: string }) =>
    pedir<void>('POST', '/auth/registro', d),
  login: (d: { email: string; contrasena: string }) =>
    pedir<{ capacidades_limitadas: boolean }>('POST', '/auth/sesion', d),
  verificar: (token: string) =>
    pedir<{ capacidades_limitadas: boolean }>('POST', '/auth/verificacion', { token }),
  recuperar: (email: string) => pedir<{ mensaje: string }>('POST', '/auth/recuperacion', { email }),
  restablecer: (token: string, contrasena_nueva: string) =>
    pedir<{ mensaje: string }>('POST', '/auth/recuperacion/restablecer', { token, contrasena_nueva }),
  logout: () => pedir<void>('DELETE', '/auth/sesion'),
  me: () => pedir<PerfilPropio>('GET', '/me'),
};
