import { ProductoAdminNoEncontrado } from '../domain/errores';
import type { DemoAdmin } from '../domain/demo-admin';
import type { UnidadDeTrabajoCatalogoAdmin } from '../domain/ports/catalogo-admin.uow';

/**
 * CU-19 A8: detalle de la demo asignada a un producto, para precargar el formulario de edición
 * (F3 del frontend). `null` si el producto todavía no tiene demo — no es un error, el form
 * arranca vacío en ese caso.
 */
export class VerDemoAdmin {
  constructor(private readonly uow: UnidadDeTrabajoCatalogoAdmin) {}

  async ejecutar(productId: string): Promise<DemoAdmin | null> {
    return this.uow.transaccion(async (repos) => {
      const existe = await repos.productos.existeProducto(productId);
      if (!existe) throw new ProductoAdminNoEncontrado();
      return repos.demos.buscarPorProducto(productId);
    });
  }
}
