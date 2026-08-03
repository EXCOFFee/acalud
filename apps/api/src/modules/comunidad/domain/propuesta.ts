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

/** Filtro del listado admin (CU-21 A7 estado, A8 orden, A9 búsqueda). */
export interface FiltroPropuestasAdmin {
  status?: EstadoPropuesta | undefined;
  search?: string | undefined;
  ordenDir?: 'asc' | 'desc' | undefined;
}

/** Fila del listado admin (CU-21 p6): incluye el nombre del docente autor. */
export interface PropuestaResumenAdmin {
  id: string;
  title: string;
  autorNombre: string;
  status: EstadoPropuesta;
  createdAt: Date;
}

/** Detalle admin (CU-21 p13): la propuesta + los datos de contacto del docente autor. */
export interface PropuestaDetalleAdmin extends Propuesta {
  autorNombre: string;
  autorEmail: string;
}
