/**
 * Puerto de lectura del listado de docentes con sus asignaciones (CU-28).
 * RN-002: se listan TODOS los docentes vinculados (membresía activa), también sin asignaciones.
 * RN-003/RN-007: cada asignación muestra su estado; el detalle incluye las revocadas.
 */

export interface FiltroDocentes {
  /** A6: solo docentes con asignación activa de este producto. */
  productoId?: string | undefined;
  /** A7: texto contenido en el nombre del docente (case-insensitive). */
  buscar?: string | undefined;
  /** A8: orden del listado. */
  orden?: 'total_licencias' | 'nombre' | undefined;
  direccion?: 'asc' | 'desc' | undefined;
}

export interface AsignacionDeDocente {
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  asignadaEn: Date;
  /** Nombre del encargado que asignó (CU-28 p6). */
  asignadaPor: string | null;
  estado: 'active' | 'revoked';
}

export interface DocenteConAsignaciones {
  docenteId: string;
  nombre: string;
  email: string;
  /** Suma de licencias ACTIVAS (A2: puede ser 0 = "Sin asignaciones"). */
  totalLicencias: number;
  ultimaAsignacionEn: Date | null;
  asignaciones: AsignacionDeDocente[];
}

/** Resumen superior del listado (CU-28 p8). */
export interface ResumenDocentes {
  totalDocentesConAsignaciones: number;
  totalLicenciasAsignadas: number;
  productosMasAsignados: { productoId: string; nombreProducto: string; total: number }[];
}

/** Detalle completo de un docente (CU-28 A9 / RN-007/RN-008: incluye revocadas con autor). */
export interface DetalleAsignacion extends AsignacionDeDocente {
  revocadaEn: Date | null;
  revocadaPor: string | null;
  razonRevocacion: string | null;
}

export interface DetalleDocente {
  docenteId: string;
  nombre: string;
  email: string;
  vinculadoEn: Date | null;
  asignaciones: DetalleAsignacion[];
}

/** CU-29 paso 2: juego asignado al docente autenticado, con su propio conteo de sesiones. */
export interface MiAsignacion {
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  asignadaEn: Date;
  totalSesiones: number;
  ultimaSesionEn: Date | null;
}

export interface DocentesRepository {
  listar(institucionId: string, filtro: FiltroDocentes): Promise<DocenteConAsignaciones[]>;
  resumen(institucionId: string): Promise<ResumenDocentes>;
  /** null si el docente no está vinculado (activo) a la institución. */
  detalle(institucionId: string, docenteId: string): Promise<DetalleDocente | null>;
  /** CU-29: Busca la membresía activa de un usuario que tenga asignado un producto específico con cantidad > 0. */
  buscarMembresiaConJuegoAsignado(usuarioId: string, productoId: string): Promise<{ institucionId: string; docenteId: string } | null>;
  /** CU-29 paso 2/CU-30: juegos asignados al propio docente autenticado (cualquier institución a la que esté vinculado). */
  misAsignaciones(usuarioId: string): Promise<MiAsignacion[]>;
}

export const DOCENTES_REPOSITORY = Symbol('DocentesRepository');
