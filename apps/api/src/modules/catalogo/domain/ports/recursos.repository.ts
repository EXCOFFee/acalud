export interface Recurso {
  id: string;
  productoId: string;
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
