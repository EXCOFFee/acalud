export interface DescargasRepository {
  /**
   * Registra en la base de datos la métrica de descarga (CU-08 §4).
   * @param recursoId ID del recurso descargado
   * @param usuarioId ID del usuario que realizó la descarga (null si es anónimo)
   */
  registrarDescarga(recursoId: string, usuarioId: string | null): Promise<void>;
}

export const DESCARGAS_REPOSITORY = Symbol('DescargasRepository');
