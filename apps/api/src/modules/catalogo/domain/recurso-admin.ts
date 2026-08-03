/** Campos del alta/edición de un recurso (CU-19 A9.4). */
export interface DatosRecurso {
  title: string;
  type: 'pdf' | 'link';
  url: string;
  isLicensed: boolean;
  /** CU-19 A9.4 / D-19: opcional. */
  productId: string | null;
}

export interface RecursoAdmin extends DatosRecurso {
  id: string;
}
