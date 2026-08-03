import type { EditorialDetalle, EditorialResumen, FiltroEditoriales } from '../editorial';

/** Puerto de lectura del directorio de editoriales (CU-17). Solo activas (RN-001). */
export interface EditorialesRepository {
  listar(filtro: FiltroEditoriales): Promise<EditorialResumen[]>;
  /** null si no existe o no está activa (A3). Registra `editorial_partner_viewed` (RN-006). */
  obtener(id: string, usuarioId: string | null): Promise<EditorialDetalle | null>;
  /** RN-007: registra el click a "Ir al sitio web". Retorna false si la editorial no existe/no está activa. */
  registrarClick(id: string, usuarioId: string | null): Promise<boolean>;
}

export const EDITORIALES_REPOSITORY = Symbol('EditorialesRepository');
