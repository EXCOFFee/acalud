/** Puerto de votación (CU-14). Separado de `EncuestasRepository`, que es solo lectura. */
export interface VotosRepository {
  /** id si la encuesta existe y está `active`; null en cualquier otro caso (A2). */
  buscarEncuestaVotable(pollId: string): Promise<{ id: string } | null>;
  existeOpcion(pollId: string, optionId: string): Promise<boolean>;
  /** Lanza EncuestaYaVotada si ya existe una fila para (pollId, userId) — UNIQUE (A1). */
  votar(pollId: string, optionId: string, userId: string): Promise<void>;
}

export const VOTOS_REPOSITORY = Symbol('VotosRepository');
