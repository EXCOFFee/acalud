import type { DatosRecurso, RecursoAdmin } from '../recurso-admin';

/** Puerto de ABM de recursos (CU-19 A9). */
export interface RecursosAdminRepository {
  listar(): Promise<RecursoAdmin[]>;
  crear(datos: DatosRecurso): Promise<RecursoAdmin>;
  /** null si el `id` no corresponde a ningún recurso. */
  actualizar(id: string, datos: DatosRecurso): Promise<RecursoAdmin | null>;
  /** Física: A9 no define baja lógica para recursos (a diferencia de RNF-008 en productos). */
  eliminar(id: string): Promise<boolean>;
}
