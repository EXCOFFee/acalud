import type { UnidadDeTrabajoCatalogoAdmin } from '../domain/ports/catalogo-admin.uow';
import type { CategoriaAdmin } from '../domain/categoria-admin';

/** CU-19 A7.2: listado de categorías existentes. */
export class ListarCategoriasAdmin {
  constructor(private readonly uow: UnidadDeTrabajoCatalogoAdmin) {}

  async ejecutar(): Promise<CategoriaAdmin[]> {
    return this.uow.transaccion((repos) => repos.categorias.listar());
  }
}
