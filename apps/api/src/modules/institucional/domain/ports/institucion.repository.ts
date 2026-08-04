import type {
  AsignacionRepository,
  NotificacionesInstitucional,
  OutboxInstitucional,
} from './asignacion.repository';
import type { DocentesRepository } from './docentes.repository';
import type { InventarioRepository } from './inventario.repository';

/** Domicilio de la institución, estructurado como lo guarda `institutions` (CU-23 p13). */
export interface DomicilioInstitucion {
  calle: string;
  numero: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
}

export interface DatosNuevaInstitucion {
  nombreLegal: string;
  identificadorTributario: string;
  emailInstitucional: string;
  domicilio: DomicilioInstitucion;
  /** Opcionales de CU-23 p3 y A11. */
  telefono: string | null;
  nivelEducativo: string | null;
  cantidadAlumnos: number | null;
}

export interface MembresiaPropia {
  institucionId: string;
  esEncargado: boolean;
}

export interface InstitucionRepository {
  /** CU-23 A1: el usuario no puede estar vinculado a otra institución. */
  estaVinculado(usuarioId: string): Promise<boolean>;
  /** Resuelve el nivel contra la tabla maestra `levels`; null si el nombre no existe. */
  buscarNivelPorNombre(nombre: string): Promise<string | null>;
  crear(datos: DatosNuevaInstitucion): Promise<string>;
  /** CU-23 p14: vincula al usuario como encargado principal (is_admin = true). */
  vincularEncargado(institucionId: string, usuarioId: string): Promise<void>;
  /**
   * A qué institución pertenece el usuario, si a alguna (frontend: sin esto no hay forma de
   * volver a encontrar `institucion_id` en una visita posterior a la del registro). null si no
   * está vinculado a ninguna.
   */
  buscarPropia(usuarioId: string): Promise<MembresiaPropia | null>;
  /** CU-32 paso 12: nombre de la institución para el encabezado/nombre del archivo exportado. */
  buscarNombre(institucionId: string): Promise<string | null>;
}

/** Auditoría propia del BC (RNF-011). Cada contexto declara la suya: ADR-002. */
export interface AuditoriaInstitucional {
  registrar(evento: {
    tipo: string;
    sujetoId: string;
    actorId: string;
    /** Entidad apuntada por `sujetoId`. La institución es el caso corriente del BC. */
    sujetoTipo?: string;
    datos?: Record<string, unknown>;
  }): Promise<void>;
}

import type { SesionesRepository } from './sesiones.repository';

export interface ReposInstitucional {
  instituciones: InstitucionRepository;
  inventario: InventarioRepository;
  asignaciones: AsignacionRepository;
  docentes: DocentesRepository;
  notificaciones: NotificacionesInstitucional;
  outbox: OutboxInstitucional;
  auditoria: AuditoriaInstitucional;
  sesiones: SesionesRepository;
}

/** Unit of Work de este bounded context: commit total o rollback total (ADR-002). */
export interface UnidadDeTrabajoInstitucional {
  transaccion<T>(fn: (repos: ReposInstitucional) => Promise<T>): Promise<T>;
}

export const UOW_INSTITUCIONAL = Symbol('UnidadDeTrabajoInstitucional');
