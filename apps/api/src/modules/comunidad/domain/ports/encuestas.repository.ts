import type { EncuestaResumen, FiltroEncuestas, ResultadosEncuesta } from '../encuesta';

/** Puerto de lectura pública del módulo Comunidad (CU-14 listado, CU-16). Solo consultas. */
export interface EncuestasRepository {
  listar(filtro: FiltroEncuestas): Promise<EncuestaResumen[]>;
  /** null si `pollId` no existe o está en `draft` (no visible, CU-16 A2). */
  obtenerResultados(pollId: string, usuarioId: string | null): Promise<ResultadosEncuesta | null>;
}

export const ENCUESTAS_REPOSITORY = Symbol('EncuestasRepository');
