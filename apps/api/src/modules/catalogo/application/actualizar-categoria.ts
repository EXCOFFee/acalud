import { CategoriaAdminNoEncontrada } from '../domain/errores';
import type { UnidadDeTrabajoCatalogoAdmin } from '../domain/ports/catalogo-admin.uow';
import type { CategoriaAdmin } from '../domain/categoria-admin';

export interface ActualizarCategoriaInput {
  nombre: string;
  adminId: string;
}

/** CU-19 A7.3: edición de categoría existente. */
export class ActualizarCategoria {
  constructor(private readonly uow: UnidadDeTrabajoCatalogoAdmin) {}

  async ejecutar(id: string, input: ActualizarCategoriaInput): Promise<CategoriaAdmin> {
    return this.uow.transaccion(async (repos) => {
      const categoria = await repos.categorias.actualizar(id, input.nombre);
      if (categoria === null) throw new CategoriaAdminNoEncontrada();

      await repos.auditoria.registrar({
        tipo: 'update',
        sujetoTipo: 'category',
        sujetoId: categoria.id,
        actorId: input.adminId,
        datos: { name: categoria.name },
      });

      return categoria;
    });
  }
}
