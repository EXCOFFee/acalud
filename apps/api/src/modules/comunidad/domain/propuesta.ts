export type EstadoPropuesta = 'pending' | 'reviewed' | 'approved' | 'rejected';

/** Campos del alta de propuesta (CU-15 p4). */
export interface DatosPropuesta {
  title: string;
  description: string;
  subjectId: string | null;
  targetLevelId: string | null;
}

export interface Propuesta {
  id: string;
  userId: string;
  title: string;
  description: string;
  subjectId: string | null;
  targetLevelId: string | null;
  status: EstadoPropuesta;
  adminFeedback: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Fila resumida del listado propio del docente (CU-15 p2 / RN-004). */
export interface PropuestaResumen {
  id: string;
  title: string;
  status: EstadoPropuesta;
  createdAt: Date;
  updatedAt: Date;
}
