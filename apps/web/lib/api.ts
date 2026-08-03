import { Capacitor } from '@capacitor/core';

// Cliente HTTP de la API. En WEB las llamadas son relativas (`/api/v1/...`) y el rewrite de
// Vercel las lleva a Render same-site → la cookie httpOnly viaja sola (ADR-004). En la APK
// (Capacitor) la cookie NO cruza origen, así que se usa **Bearer**: se guarda el token opaco de
// la sesión y se envía en `Authorization`. La base absoluta (APK/dev) se fija con NEXT_PUBLIC_API_BASE.
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

function esNativo(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

const CLAVE_TOKEN = 'acalud_token';
let tokenSesion: string | null = null;

/** Guarda o limpia el token de sesión — SOLO en la APK; la web nunca lo toca (usa cookie). */
export function guardarTokenSesion(token: string | null): void {
  if (!esNativo()) return;
  tokenSesion = token;
  try {
    if (token) localStorage.setItem(CLAVE_TOKEN, token);
    else localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    /* sin localStorage (SSR/export) */
  }
}

function tokenActual(): string | null {
  if (!esNativo()) return null;
  if (tokenSesion !== null) return tokenSesion;
  try {
    tokenSesion = localStorage.getItem(CLAVE_TOKEN);
  } catch {
    /* sin localStorage */
  }
  return tokenSesion;
}

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
  const headers: Record<string, string> = {};
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  const token = tokenActual(); // solo en APK; en web es null → viaja la cookie
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const init: RequestInit = { method: metodo, credentials: 'include' };
  if (Object.keys(headers).length > 0) init.headers = headers;
  if (cuerpo !== undefined) init.body = JSON.stringify(cuerpo);

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
  nivel_educativo: string | null;
  materia: string | null;
  institucion: string | null;
}

export interface JuegoResumen {
  id: string;
  nombre: string;
  precio_lista: number;
  area: string | null;
  imagen_url: string | null;
  tiene_demo_publica: boolean;
}

export interface Tramo {
  cantidad_minima: number;
  descuento_pct: number;
}

export interface JuegoDetalle extends JuegoResumen {
  descripcion: string;
  peso_gramos: number | null;
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

export interface ContenidoDemo {
  juegoId: string;
  demoId: string;
  tipo: 'publica' | 'completa';
  formato: 'html5' | 'pdf' | 'video';
  urlEmbebido: string;
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

export type ModalidadEnvio = 'home_delivery' | 'branch_pickup';

export interface OpcionEnvio {
  modalidad: ModalidadEnvio;
  nombre_servicio: string;
  costo: number;
  plazo_estimado_dias: number;
  tracking_disponible: boolean;
}

export type EstadoPedido = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'under_review';

export interface OrdenHistorial {
  id: string;
  numero: string;
  fecha: string; // ISO 8601
  total: number;
  estado: EstadoPedido;
  tracking_code: string | null;
}

export interface ResultadoPaginado<T> {
  items: T[];
  total_items: number;
  total_paginas: number;
  pagina_actual: number;
}

export interface LineaOrdenHistorial {
  juego_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  descuento_pct: number;
}

export interface DetalleOrdenHistorial {
  id: string;
  numero: string;
  fecha: string;
  estado: EstadoPedido;
  subtotal: number;
  envio_costo: number;
  total: number;
  tracking_code: string | null;
  domicilio: {
    calle: string | null;
    numero: string | null;
    localidad: string | null;
    provincia: string | null;
    codigo_postal: string | null;
  };
  lineas: LineaOrdenHistorial[];
}

export interface EventoTracking {
  estado: string;
  ubicacion: string | null;
  descripcion: string;
  fecha: string | null;
}

export interface Seguimiento {
  estado_actual: string;
  eventos: EventoTracking[];
  fecha_estimada_entrega: string | null;
  direccion_entrega: string | null;
  ultima_actualizacion: string;
  desde_cache: boolean;
}

export interface EditorialResumen {
  id: string;
  nombre: string;
  logo_url: string | null;
  descripcion: string;
  sitio_web: string | null;
}

export interface EditorialDetalle extends EditorialResumen {
  categoria: string | null;
}

export type TipoFavorito = 'product' | 'resource' | 'editorial_partner';

export interface FavoritoResumen {
  id: string;
  tipo: TipoFavorito;
  item_id: string;
  titulo: string;
  creado_en: string;
}

export interface MiInstitucion {
  institucion_id: string | null;
  es_encargado: boolean;
}

export interface DomicilioInstitucion {
  calle: string;
  numero: string;
  localidad: string;
  provincia: string;
  codigo_postal: string;
}

export interface RegistrarInstitucionInput {
  nombre_legal: string;
  identificador_tributario: string;
  email_institucional: string;
  domicilio: DomicilioInstitucion;
  telefono?: string | null;
  nivel_educativo?: string | null;
  cantidad_alumnos?: number | null;
}

export interface ItemInventarioInstitucional {
  producto_id: string;
  nombre_producto: string;
  descripcion_producto: string | null;
  cantidad_adquirida: number;
  cantidad_asignada: number;
  cantidad_disponible: number;
  ultima_compra_en: string | null;
  total_gastado: number | null;
}

export interface InventarioInstitucional {
  institucion_id: string;
  resumen: {
    total_adquiridas: number;
    docentes_asignados: number;
    total_en_uso: number;
    total_disponibles: number;
  };
  items: ItemInventarioInstitucional[];
}

export interface DetalleProductoInventario {
  producto_id: string;
  nombre_producto: string;
  descripcion_producto: string | null;
  precio: number;
  cantidad_adquirida: number;
  cantidad_asignada: number;
  cantidad_disponible: number;
  compras: { orden_id: string; numero: string; fecha: string; cantidad: number; monto: number }[];
  docentes: {
    docente_id: string;
    nombre: string;
    cantidad: number;
    asignada_en: string;
    estado: 'active' | 'revoked';
  }[];
}

export type OrdenInventario = 'cantidad_adquirida' | 'cantidad_asignada' | 'cantidad_disponible' | 'ultima_compra' | 'nombre';

export interface FiltroInventario {
  orden?: OrdenInventario;
  direccion?: 'asc' | 'desc';
}

export interface DocenteInstitucion {
  docente_id: string;
  nombre: string;
  email: string;
  total_licencias: number;
}

export interface ListadoDocentesInstitucion {
  institucion_id: string;
  docentes: DocenteInstitucion[];
}

export interface LicenciasAsignadas {
  producto_id: string;
  asignaciones: { asignacion_id: string; docente_id: string; cantidad: number }[];
  cantidad_disponible: number;
}

export interface LicenciaRevocada {
  producto_id: string;
  docente_id: string;
  cantidad_revocada: number;
  cantidad_restante: number;
}

// CU-28: listado completo de docentes con sus asignaciones (a diferencia de `DocenteInstitucion`,
// que solo trae lo mínimo para el picker de CU-26).
export interface AsignacionDocente {
  producto_id: string;
  nombre_producto: string;
  cantidad: number;
  asignada_en: string;
  asignada_por: string | null;
  estado: 'active' | 'revoked';
}

export interface DocenteAsignado {
  docente_id: string;
  nombre: string;
  email: string;
  total_licencias: number;
  ultima_asignacion_en: string | null;
  asignaciones: AsignacionDocente[];
}

export interface ResumenDocentesAsignados {
  total_docentes_con_asignaciones: number;
  total_licencias_asignadas: number;
  productos_mas_asignados: { producto_id: string; nombre_producto: string; total: number }[];
}

export interface ListadoDocentesAsignados {
  institucion_id: string;
  resumen: ResumenDocentesAsignados;
  docentes: DocenteAsignado[];
}

export interface FiltroDocentesAsignados {
  producto_id?: string | undefined;
  buscar?: string | undefined;
  orden?: 'total_licencias' | 'nombre' | undefined;
  direccion?: 'asc' | 'desc' | undefined;
}

export interface DetalleDocenteAsignaciones {
  docente_id: string;
  nombre: string;
  email: string;
  vinculado_en: string | null;
  asignaciones: (AsignacionDocente & {
    revocada_en: string | null;
    revocada_por: string | null;
    razon_revocacion: string | null;
  })[];
}

export interface FiltroPedidos {
  estado?: EstadoPedido | undefined;
  orden_por?: 'created_at' | 'total_amount' | undefined;
  orden_dir?: 'asc' | 'desc' | undefined;
  pagina?: number | undefined;
  limite?: number | undefined;
}

// CU-29/CU-30: juegos asignados al docente autenticado + sesiones de uso que cargó.
export interface MiJuegoAsignado {
  producto_id: string;
  nombre_producto: string;
  cantidad: number;
  asignada_en: string;
  total_sesiones: number;
  ultima_sesion_en: string | null;
}

export interface CargarSesionInput {
  producto_id: string;
  fecha_uso: string;
  grupo: string;
  cantidad_estudiantes: number;
  duracion_minutos: number;
  satisfaccion_docente: number;
  aprendizajes_clave: string;
  dificultades?: string | null;
  reutilizaria: boolean;
}

// El controlador de docentes/me devuelve estos objetos tal cual los arma la capa de aplicación,
// en camelCase — a diferencia del resto de la API, no hay un mapeo a snake_case en el borde HTTP.
export interface SesionResumen {
  id: string;
  fecha: string;
  productoId: string;
  nombreProducto: string;
  grupo: string;
  estudiantes: number;
  duracionMinutos: number;
  satisfaccion: number;
  aprendizajes: string;
}

export interface SesionDetalle extends SesionResumen {
  dificultades: string | null;
  reutilizaria: boolean;
  registradaEn: string;
}

export interface ResultadoPaginadoSesiones {
  items: SesionResumen[];
  totalItems: number;
  totalPaginas: number;
  paginaActual: number;
}

export interface FiltroMisSesiones {
  producto_id?: string | undefined;
  pagina?: number | undefined;
  limite?: number | undefined;
}

// CU-31/CU-32: reporte institucional agregado (por juego o por docente) + export a CSV. El
// backend real es un GROUP BY simple, sin gráficos/nube de palabras/PDF/Excel — eso quedó
// pendiente para cuando se aprueben esas dependencias (ver ADR-006-style comment en el código).
export interface FiltroReporte {
  corte: 'juego' | 'docente';
  desde?: string | undefined;
  hasta?: string | undefined;
  producto_id?: string | undefined;
  docente_id?: string | undefined;
}

export interface FilaReporteJuego {
  producto_id: string;
  nombre_producto: string;
  total_sesiones: number;
  docentes_distintos: number;
  alumnos_alcanzados: number;
  minutos_totales: number;
  ultima_sesion: string | null;
}

export interface FilaReporteDocente {
  docente_id: string;
  nombre_docente: string;
  total_sesiones: number;
  juegos_distintos: number;
  alumnos_alcanzados: number;
  minutos_totales: number;
}

export interface ReporteInstitucional {
  institucion_id: string;
  corte: 'juego' | 'docente';
  filtros: { desde?: string; hasta?: string; producto_id?: string; docente_id?: string };
  datos: FilaReporteJuego[] | FilaReporteDocente[];
}

// CU-33: dashboard pedagógico — 4 KPIs con variación % vs período anterior, serie semanal y
// top 5 juegos/docentes. Solo admite filtro por rango de fechas (a diferencia de lo que pide
// el CU: juego/docente/nivel educativo quedaron pendientes, ver docs/claude/05-pendientes-post-frontend.md).
export interface KPIDashboard {
  valor: number;
  variacion_porcentual: number | null;
}

export interface DashboardPedagogico {
  institucion_id: string;
  rango: { desde: string; hasta: string };
  kpis: {
    sesiones: KPIDashboard;
    docentes_activos: KPIDashboard;
    alumnos_alcanzados: KPIDashboard;
    minutos_de_juego: KPIDashboard;
  };
  serie_semanal: { semana: string; sesiones: number }[];
  top_juegos: { producto_id: string; nombre: string; sesiones: number }[];
  top_docentes: { docente_id: string; nombre: string; sesiones: number }[];
}

export interface FiltroDashboard {
  desde?: string | undefined;
  hasta?: string | undefined;
}

function armarQueryReporte(filtro: FiltroReporte): string {
  const qs = new URLSearchParams();
  qs.set('corte', filtro.corte);
  if (filtro.desde) qs.set('desde', filtro.desde);
  if (filtro.hasta) qs.set('hasta', filtro.hasta);
  if (filtro.producto_id) qs.set('producto_id', filtro.producto_id);
  if (filtro.docente_id) qs.set('docente_id', filtro.docente_id);
  return qs.toString();
}

export const api = {
  registro: (d: { email: string; contrasena: string; nombre: string; apellido: string }) =>
    pedir<void>('POST', '/auth/registro', d),
  login: async (d: { email: string; contrasena: string }) => {
    const r = await pedir<{ token: string; capacidades_limitadas: boolean }>('POST', '/auth/sesion', d);
    guardarTokenSesion(r.token); // no-op en web; guarda el Bearer en la APK
    return r;
  },
  verificar: async (token: string) => {
    const r = await pedir<{ token: string; capacidades_limitadas: boolean }>('POST', '/auth/verificacion', { token });
    guardarTokenSesion(r.token);
    return r;
  },
  recuperar: (email: string) => pedir<{ mensaje: string }>('POST', '/auth/recuperacion', { email }),
  restablecer: (token: string, contrasena_nueva: string) =>
    pedir<{ mensaje: string }>('POST', '/auth/recuperacion/restablecer', { token, contrasena_nueva }),
  logout: async () => {
    await pedir<void>('DELETE', '/auth/sesion');
    guardarTokenSesion(null);
  },
  me: () => pedir<PerfilPropio>('GET', '/me'),
  cambioCorreo: (nuevo_email: string, contrasena: string) =>
    pedir<{ mensaje: string }>('POST', '/me/cambio-correo', { nuevo_email, contrasena }),
  confirmarCambioCorreo: (token: string) =>
    pedir<{ mensaje: string }>('POST', '/auth/cambio-correo/confirmar', { token }),
  actualizarPerfil: (datos: {
    nombre: string;
    apellido: string;
    nivel_educativo?: string | null;
    materia?: string | null;
    institucion?: string | null;
  }) => pedir<PerfilPropio>('PUT', '/me', datos),
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
  // CU-06: pública, sin sesión. CU-07: completa, requiere sesión (401 si no hay).
  probarDemoPublica: (juegoId: string) => pedir<ContenidoDemo>('GET', `/catalogo/juegos/${juegoId}/demo/publica`),
  probarDemoCompleta: (juegoId: string) => pedir<ContenidoDemo>('GET', `/catalogo/juegos/${juegoId}/demo/completa`),
  // CU-08 (recurso libre, sin sesión) / CU-09 (licenciado, requiere haberlo comprado).
  descargarRecurso: (recursoId: string) =>
    pedir<{ url_firmada: string; expira_en?: string }>('POST', `/catalogo/recursos/${recursoId}/descarga`),
  verCarrito: () => pedir<CarritoView>('GET', '/carrito'),
  ponerLinea: (juegoId: string, cantidad: number) =>
    pedir<CarritoView>('PUT', `/carrito/lineas/${juegoId}`, { cantidad }),
  quitarLinea: (juegoId: string) => pedir<CarritoView>('DELETE', `/carrito/lineas/${juegoId}`),
  // CU-11: cotización en tiempo real, sin autenticación (también la usa un usuario anónimo).
  calcularEnvio: (codigo_postal: string, items: { product_id: string; quantity: number }[]) =>
    pedir<{ opciones: OpcionEnvio[] }>('POST', '/shipping/calculate', { codigo_postal, items }),
  iniciarCheckout: (d: {
    modalidad_envio: ModalidadEnvio;
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
  listarPedidos: (filtro?: FiltroPedidos) => {
    const qs = new URLSearchParams();
    if (filtro?.estado) qs.set('estado', filtro.estado);
    if (filtro?.orden_por) qs.set('orden_por', filtro.orden_por);
    if (filtro?.orden_dir) qs.set('orden_dir', filtro.orden_dir);
    if (filtro?.pagina) qs.set('pagina', String(filtro.pagina));
    if (filtro?.limite) qs.set('limite', String(filtro.limite));
    const cola = qs.toString() ? `?${qs.toString()}` : '';
    return pedir<ResultadoPaginado<OrdenHistorial>>('GET', `/pedidos${cola}`);
  },
  verPedido: (id: string) => pedir<DetalleOrdenHistorial>('GET', `/pedidos/${id}`),
  // CU-13: RNF-009, el código de tracking nunca va en la URL — se resuelve server-side por order_id.
  verSeguimiento: (id: string) => pedir<Seguimiento>('GET', `/pedidos/${id}/tracking`),
  // CU-17: directorio público (anónimo o logueado). `category` es texto libre, sin tabla maestra.
  listarEditoriales: (category?: string) => {
    const qs = category ? `?category=${encodeURIComponent(category)}` : '';
    return pedir<EditorialResumen[]>('GET', `/editorial-partners${qs}`);
  },
  verEditorial: (id: string) => pedir<EditorialDetalle>('GET', `/editorial-partners/${id}`),
  // A1/A2: se llama antes de abrir la URL externa, tanto logueado como anónimo.
  clickEditorial: (id: string) => pedir<void>('POST', `/editorial-partners/${id}/click`),
  // CU-18: favoritos polimórficos (producto/recurso/editorial), requiere sesión (RN-008).
  misFavoritos: () => pedir<FavoritoResumen[]>('GET', '/favorites'),
  guardarFavorito: (campo: 'producto_id' | 'recurso_id' | 'editorial_id', id: string) =>
    pedir<{ id: string }>('POST', '/favorites', { [campo]: id }),
  quitarFavorito: (favoritoId: string) => pedir<void>('DELETE', `/favorites/${favoritoId}`),
  // CU-23/BC Institucional. `miInstitucion` es la única forma de recuperar institucion_id
  // fuera del instante de creación (registrarInstitucion lo devuelve una sola vez).
  miInstitucion: () => pedir<MiInstitucion>('GET', '/instituciones/mine'),
  registrarInstitucion: (d: RegistrarInstitucionInput) =>
    pedir<{ institucion_id: string }>('POST', '/instituciones', d),
  // CU-25: RN-004, solo el encargado (is_admin) ve el inventario — el backend responde 404 (no
  // 403) para cualquier otro caso, mismo criterio "ajeno = 404" del resto del proyecto.
  verInventario: (institucionId: string, filtro?: FiltroInventario) => {
    const qs = new URLSearchParams();
    if (filtro?.orden) qs.set('orden', filtro.orden);
    if (filtro?.direccion) qs.set('direccion', filtro.direccion);
    const cola = qs.toString() ? `?${qs.toString()}` : '';
    return pedir<InventarioInstitucional>('GET', `/instituciones/${institucionId}/inventario${cola}`);
  },
  verDetalleInventario: (institucionId: string, productoId: string) =>
    pedir<DetalleProductoInventario>('GET', `/instituciones/${institucionId}/inventario/${productoId}`),
  // CU-28: se usa acá solo para poblar el selector de docentes de CU-26 (D3) — el listado
  // completo con asignaciones (D4) trae más campos que esta unidad no necesita.
  listarDocentesInstitucion: (institucionId: string) =>
    pedir<ListadoDocentesInstitucion>('GET', `/instituciones/${institucionId}/docentes/asignaciones`),
  // CU-26: uno o más docentes por request; esta unidad manda de a un docente por vez (simplifica
  // la UI, el backend igual acepta batch si en el futuro se arma un formulario multi-línea).
  asignarLicencias: (
    institucionId: string,
    d: { producto_id: string; asignaciones: { docente_id: string; cantidad: number }[]; observaciones?: string | null },
  ) => pedir<LicenciasAsignadas>('POST', `/instituciones/${institucionId}/asignaciones`, d),
  // CU-27.
  revocarLicencia: (
    institucionId: string,
    d: { docente_id: string; producto_id: string; cantidad_a_revocar: number; observaciones?: string | null },
  ) => pedir<LicenciaRevocada>('POST', `/instituciones/${institucionId}/revocaciones`, d),
  // CU-28: listado completo (A6 filtro por producto, A7 búsqueda por nombre, A8 orden). No
  // soporta filtrar por estado de asignación — el backend no expone ese parámetro todavía.
  verDocentesAsignados: (institucionId: string, filtro?: FiltroDocentesAsignados) => {
    const qs = new URLSearchParams();
    if (filtro?.producto_id) qs.set('producto_id', filtro.producto_id);
    if (filtro?.buscar) qs.set('buscar', filtro.buscar);
    if (filtro?.orden) qs.set('orden', filtro.orden);
    if (filtro?.direccion) qs.set('direccion', filtro.direccion);
    const cola = qs.toString() ? `?${qs.toString()}` : '';
    return pedir<ListadoDocentesAsignados>('GET', `/instituciones/${institucionId}/docentes/asignaciones${cola}`);
  },
  // CU-28 A9: detalle de un docente, incluye asignaciones revocadas (RN-007/RN-008).
  verDetalleDocenteAsignado: (institucionId: string, docenteId: string) =>
    pedir<DetalleDocenteAsignaciones>('GET', `/instituciones/${institucionId}/docentes/asignaciones/${docenteId}`),
  // CU-29 paso 2/CU-30: juegos que el propio docente tiene asignados (lista vacía si no está
  // vinculado a ninguna institución — no es un error, RN de CU-29 A1).
  misJuegosAsignados: () => pedir<{ juegos: MiJuegoAsignado[] }>('GET', '/docentes/me/asignaciones'),
  // CU-29: registra una sesión de uso pedagógico de un juego asignado.
  cargarSesion: (d: CargarSesionInput) => pedir<{ sessionId: string }>('POST', '/docentes/me/sesiones-juego', d),
  // CU-30: historial paginado de sesiones propias, opcionalmente filtrado por juego.
  misSesiones: (filtro?: FiltroMisSesiones) => {
    const qs = new URLSearchParams();
    if (filtro?.producto_id) qs.set('producto_id', filtro.producto_id);
    if (filtro?.pagina) qs.set('pagina', String(filtro.pagina));
    if (filtro?.limite) qs.set('limite', String(filtro.limite));
    const cola = qs.toString() ? `?${qs.toString()}` : '';
    return pedir<ResultadoPaginadoSesiones>('GET', `/docentes/me/sesiones-juego${cola}`);
  },
  // CU-30 A9: detalle completo de una sesión propia.
  verDetalleSesion: (id: string) => pedir<SesionDetalle>('GET', `/docentes/me/sesiones-juego/${id}`),
  // CU-31: reporte agregado por juego o por docente.
  verReporte: (institucionId: string, filtro: FiltroReporte) =>
    pedir<ReporteInstitucional>('GET', `/instituciones/${institucionId}/reportes/uso?${armarQueryReporte(filtro)}`),
  // CU-32: descarga el CSV directamente — no pasa por `pedir` porque la respuesta es un
  // archivo, no JSON. Reutiliza la misma lógica de auth (cookie web / Bearer APK).
  exportarReporte: async (institucionId: string, filtro: FiltroReporte): Promise<void> => {
    const headers: Record<string, string> = {};
    const token = tokenActual();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(
      `${BASE}/api/v1/instituciones/${institucionId}/reportes/uso/exportar?${armarQueryReporte(filtro)}`,
      { method: 'GET', credentials: 'include', headers },
    );
    if (!res.ok) {
      let problema: ProblemDetails = {};
      try {
        problema = (await res.json()) as ProblemDetails;
      } catch {
        /* respuesta sin cuerpo */
      }
      throw new ApiError(res.status, problema);
    }
    const disposicion = res.headers.get('Content-Disposition') ?? '';
    const nombreArchivo = /filename="([^"]+)"/.exec(disposicion)?.[1] ?? 'reporte.csv';
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  // CU-33: sin filtro, el backend usa los últimos 30 días por defecto.
  verDashboard: (institucionId: string, filtro?: FiltroDashboard) => {
    const qs = new URLSearchParams();
    if (filtro?.desde) qs.set('desde', filtro.desde);
    if (filtro?.hasta) qs.set('hasta', filtro.hasta);
    const cola = qs.toString() ? `?${qs.toString()}` : '';
    return pedir<DashboardPedagogico>('GET', `/instituciones/${institucionId}/dashboard${cola}`);
  },
};
