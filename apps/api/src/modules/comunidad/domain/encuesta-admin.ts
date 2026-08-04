/** Estado de la encuesta (D-48 del DER): reemplaza el booleano `is_active` del texto de CU-20. */
export type EstadoEncuesta = 'draft' | 'active' | 'closed';

/** Campos del alta/edición de encuesta (CU-20 p6). */
export interface DatosEncuesta {
  question: string;
  targetLevelId: string | null;
  opciones: string[]; // 2 a 10, sin vacíos ni duplicados — validado en el borde (Zod)
}

export interface OpcionEncuesta {
  id: string;
  text: string;
}

export interface EncuestaAdmin {
  id: string;
  question: string;
  status: EstadoEncuesta;
  targetLevelId: string | null;
  createdAt: Date;
  opciones: OpcionEncuesta[];
}

/** Fila resumida del listado admin (p4): estado, fecha, total de votos. */
export interface EncuestaAdminResumen {
  id: string;
  question: string;
  status: EstadoEncuesta;
  targetLevelId: string | null;
  createdAt: Date;
  totalVotes: number;
}
