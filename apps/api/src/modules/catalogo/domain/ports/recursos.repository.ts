export interface Recurso {
  id: string;
  /** CU-19 A9.4 / D-19: opcional — hay recursos sin producto asociado. */
  productoId: string | null;
  titulo: string;
  isLicensed: boolean;
  type: 'pdf' | 'link';
  url: string | null;
}

export interface RecursosRepository {
  obtener(id: string): Promise<Recurso | null>;
  incrementarDescargas(id: string): Promise<void>;
}

export const RECURSOS_REPOSITORY = Symbol('RecursosRepository');
