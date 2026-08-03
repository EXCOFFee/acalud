import type { UnidadDeTrabajoCatalogoAdmin } from '../domain/ports/catalogo-admin.uow';
import type { RecursoAdmin } from '../domain/recurso-admin';

/** CU-19 A9.2: listado de recursos existentes. */
export class ListarRecursosAdmin {
  constructor(private readonly uow: UnidadDeTrabajoCatalogoAdmin) {}

  async ejecutar(): Promise<RecursoAdmin[]> {
    return this.uow.transaccion((repos) => repos.recursos.listar());
  }
}
