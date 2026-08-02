import { ProductoAdminNoEncontrado } from '../domain/errores';
import type { UnidadDeTrabajoCatalogoAdmin } from '../domain/ports/catalogo-admin.uow';
import type { ProductoAdmin } from '../domain/producto-admin';

/**
 * CU-19 A2 · Eliminar/Desactivar producto. RNF-008: la baja es siempre LÓGICA (nunca DELETE
 * físico), para no romper la integridad de órdenes históricas que referencian el producto.
 */
export class DesactivarProducto {
  constructor(private readonly uow: UnidadDeTrabajoCatalogoAdmin) {}

  async ejecutar(id: string, adminId: string): Promise<ProductoAdmin> {
    return this.uow.transaccion(async (repos) => {
      const producto = await repos.productos.desactivar(id);
      if (producto === null) throw new ProductoAdminNoEncontrado();

      await repos.auditoria.registrar({
        tipo: 'delete',
        sujetoId: producto.id,
        actorId: adminId,
        datos: { name: producto.name },
      });

      return producto;
    });
  }
}
