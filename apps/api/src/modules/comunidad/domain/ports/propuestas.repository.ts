import type {
  DatosPropuesta,
  EstadoPropuesta,
  FiltroPropuestasAdmin,
  Propuesta,
  PropuestaDetalleAdmin,
  PropuestaResumen,
  PropuestaResumenAdmin,
} from '../propuesta';

export interface AdminDestino {
  id: string;
  email: string;
  nombre: string;
}

/** Puerto de propuestas (CU-15 envío + CU-21 revisión admin). */
export interface PropuestasRepository {
  existeMateria(subjectId: string): Promise<boolean>;
  existeNivel(nivelId: string): Promise<boolean>;
  /** D-51: heurística — mismo usuario + mismo título (case-insensitive) en las últimas 24 h. */
  existeDuplicadaReciente(userId: string, title: string): Promise<boolean>;
  crear(userId: string, datos: DatosPropuesta): Promise<Propuesta>;
  /** CU-15 p2 / RN-004: las propuestas del propio usuario, más recientes primero. */
  listarPropias(userId: string): Promise<PropuestaResumen[]>;
  /** CU-15 RN-005: "el equipo editorial" son todos los usuarios con role = admin. */
  listarAdministradores(): Promise<AdminDestino[]>;

  /** CU-21 p4-p8 / A7/A8/A9: listado admin con filtro, búsqueda y orden por fecha. */
  listarAdmin(filtro: FiltroPropuestasAdmin): Promise<PropuestaResumenAdmin[]>;
  /** CU-21 p9-p13. null si `id` no existe (A4). */
  obtenerAdmin(id: string): Promise<PropuestaDetalleAdmin | null>;
  /** CU-21 p20-p22. null si `id` no existe. */
  actualizarEstado(id: string, status: EstadoPropuesta, feedback: string | null): Promise<Propuesta | null>;
}
