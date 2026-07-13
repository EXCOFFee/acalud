import type { FiltroCatalogo, JuegoDetalle, PaginaJuegos } from '../juego';

/** Puerto de lectura del catálogo (BC2). Solo consultas: el catálogo es read-only en CU-006. */
export interface CatalogoRepository {
  listarPublicados(filtro: FiltroCatalogo): Promise<PaginaJuegos>;
  verPublicado(id: string): Promise<JuegoDetalle | null>;
}

export const CATALOGO_REPOSITORY = Symbol('CatalogoRepository');
