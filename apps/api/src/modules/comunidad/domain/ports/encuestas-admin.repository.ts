import type { DatosEncuesta, EncuestaAdmin, EncuestaAdminResumen } from '../encuesta-admin';

/** Puerto de ABM de encuestas (CU-20). */
export interface EncuestasAdminRepository {
  listar(): Promise<EncuestaAdminResumen[]>;
  obtener(id: string): Promise<EncuestaAdmin | null>;
  existeNivel(nivelId: string): Promise<boolean>;
  crear(datos: DatosEncuesta): Promise<EncuestaAdmin>;
  /** Reemplaza pregunta, nivel y el set completo de opciones. null si `id` no existe. */
  actualizar(id: string, datos: DatosEncuesta): Promise<EncuestaAdmin | null>;
  /** CU-20 A1: alterna draft↔active. null si `id` no existe. */
  alternarEstado(id: string): Promise<EncuestaAdmin | null>;
  /** Física con cascada (poll_options y poll_responses ya tienen ON DELETE CASCADE, RN-006). */
  eliminar(id: string): Promise<boolean>;
}
