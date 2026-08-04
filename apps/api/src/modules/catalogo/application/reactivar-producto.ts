import { ProductoAdminNoEncontrado } from '../domain/errores';
import type { UnidadDeTrabajoCatalogoAdmin } from '../domain/ports/catalogo-admin.uow';
import type { ProductoAdmin } from '../domain/producto-admin';

/**
 * F2 · Reactivar producto desactivado. Inverso de `DesactivarProducto` — no lo reemplaza, es su
 * propia operación (RN-002: cada operación del catálogo se audita por separado).
 */
export class ReactivarProducto {
  constructor(private readonly uow: UnidadDeTrabajoCatalogoAdmin) {}

  async ejecutar(id: string, adminId: string): Promise<ProductoAdmin> {
    return this.uow.transaccion(async (repos) => {
      const producto = await repos.productos.reactivar(id);
      if (producto === null) throw new ProductoAdminNoEncontrado();

      await repos.auditoria.registrar({
        tipo: 'reactivate',
        sujetoTipo: 'product',
        sujetoId: producto.id,
        actorId: adminId,
        datos: { name: producto.name },
      });

      return producto;
    });
  }
}
