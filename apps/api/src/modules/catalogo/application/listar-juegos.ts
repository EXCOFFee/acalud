import type { FiltroCatalogo, JuegoResumen } from '../domain/juego';
import type { CatalogoRepository } from '../domain/ports/catalogo.repository';

export interface ListadoJuegos {
  datos: JuegoResumen[];
  paginacion: { pagina: number; tamanio: number; total: number };
}

/** CU-006 · Listar juegos publicados (con búsqueda por texto y filtro por área, paginado). */
export class ListarJuegos {
  constructor(private readonly repo: CatalogoRepository) {}

  async ejecutar(filtro: FiltroCatalogo): Promise<ListadoJuegos> {
    const { datos, total } = await this.repo.listarPublicados(filtro);
    return { datos, paginacion: { pagina: filtro.pagina, tamanio: filtro.tamanio, total } };
  }
}
