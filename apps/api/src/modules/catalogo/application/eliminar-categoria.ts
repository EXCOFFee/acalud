import { CategoriaAdminNoEncontrada } from '../domain/errores';
import type { UnidadDeTrabajoCatalogoAdmin } from '../domain/ports/catalogo-admin.uow';

/** CU-19 A7.3: baja de categoría. Física: `products.category_id` es `ON DELETE SET NULL`. */
export class EliminarCategoria {
  constructor(private readonly uow: UnidadDeTrabajoCatalogoAdmin) {}

  async ejecutar(id: string, adminId: string): Promise<void> {
    return this.uow.transaccion(async (repos) => {
      const eliminada = await repos.categorias.eliminar(id);
      if (!eliminada) throw new CategoriaAdminNoEncontrada();

      await repos.auditoria.registrar({
        tipo: 'delete',
        sujetoTipo: 'category',
        sujetoId: id,
        actorId: adminId,
      });
    });
  }
}
