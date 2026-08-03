/** Encuestas visibles públicamente: nunca `draft` (CU-16 §4 habla de "activas y finalizadas"). */
export type EstadoEncuestaPublica = 'active' | 'closed';

export interface FiltroEncuestas {
  status?: EstadoEncuestaPublica | undefined; // A6
  levelId?: string | undefined; // A8 (CU-14) / filtro por nivel
}

export interface EncuestaResumen {
  id: string;
  question: string;
  status: EstadoEncuestaPublica;
  targetLevelId: string | null;
  totalVotes: number;
  createdAt: Date;
}

export interface OpcionResultado {
  id: string;
  text: string;
  voteCount: number;
  percentage: number; // RN-006 (CU-16): redondeado a 1 decimal
}

/** CU-16 §4: resultado agregado. `hasUserVoted`/`optionIdVotada` solo tienen sentido logueado. */
export interface ResultadosEncuesta {
  pollId: string;
  question: string;
  status: EstadoEncuestaPublica;
  totalVotes: number;
  opciones: OpcionResultado[];
  hasUserVoted: boolean;
  optionIdVotada: string | null;
}
