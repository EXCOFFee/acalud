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

export interface JuegoResumen {
  id: string;
  nombre: string;
  precio_lista: number;
  area: string | null;
  edad_objetivo: string | null;
  imagen_url: string | null;
  tiene_demo_publica: boolean;
}

export interface Tramo {
  cantidad_minima: number;
  descuento_pct: number;
}

export interface JuegoDetalle extends JuegoResumen {
  descripcion: string;
  peso_gramos: number;
  stock_disponible: boolean;
  imagenes: string[];
  demos: { tipo: string; formato: string }[];
  recursos: { id: string; nombre: string; tipo: string; desbloqueado: boolean }[];
  tramos: Tramo[];
}

export interface ListadoJuegos {
  datos: JuegoResumen[];
  paginacion: { pagina: number; tamanio: number; total: number };
}

export interface LineaCarrito {
  juego_id: string;
  nombre: string;
  cantidad: number;
  precio_lista: number;
  descuento_pct: number;
  precio_unitario: number;
  subtotal: number;
  disponible: boolean;
}

export interface CarritoView {
  lineas: LineaCarrito[];
  total: number;
  ahorro_total: number;
  contexto: string | null;
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
  listarJuegos: (params?: {
    q?: string | undefined;
    area?: string | undefined;
    pagina?: number | undefined;
  }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.area) qs.set('area', params.area);
    if (params?.pagina) qs.set('pagina', String(params.pagina));
    const cola = qs.toString() ? `?${qs.toString()}` : '';
    return pedir<ListadoJuegos>('GET', `/catalogo/juegos${cola}`);
  },
  verJuego: (id: string) => pedir<JuegoDetalle>('GET', `/catalogo/juegos/${id}`),
  verCarrito: () => pedir<CarritoView>('GET', '/carrito'),
  ponerLinea: (juegoId: string, cantidad: number) =>
    pedir<CarritoView>('PUT', `/carrito/lineas/${juegoId}`, { cantidad }),
  quitarLinea: (juegoId: string) => pedir<CarritoView>('DELETE', `/carrito/lineas/${juegoId}`),
  iniciarCheckout: (d: {
    modalidad_envio: 'domicilio' | 'sucursal';
    codigo_postal: string;
    domicilio: {
      calle: string;
      numero: string;
      codigo_postal: string;
      provincia: string;
      localidad: string;
    };
  }) => pedir<{ pedido_id: string; init_point: string }>('POST', '/checkout', d),
  // Demo del pago fake (Etapa 1): simula la notificación de MP. En prod es el webhook firmado.
  confirmarPagoDemo: (paymentId: string) =>
    pedir<{ resultado: string }>('POST', '/webhooks/mercadopago', { payment_id: paymentId }),
};
