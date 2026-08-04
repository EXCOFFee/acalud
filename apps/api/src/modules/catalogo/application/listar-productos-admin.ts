import { ProductoAdminNoEncontrado } from '../domain/errores';
import type { ProductoAdmin } from '../domain/producto-admin';
import type { UnidadDeTrabajoCatalogoAdmin } from '../domain/ports/catalogo-admin.uow';
import type {
  FiltroProductosAdmin,
  PaginaProductosAdmin,
} from '../domain/ports/productos-admin.repository';

/** CU-19 p4 (y A8.2): listado admin con búsqueda y paginación, incluye inactivos. */
export class ListarProductosAdmin {
  constructor(private readonly uow: UnidadDeTrabajoCatalogoAdmin) {}

  async ejecutar(filtro: FiltroProductosAdmin): Promise<PaginaProductosAdmin> {
    return this.uow.transaccion((repos) => repos.productos.listar(filtro));
  }

  /** CU-19 A1: detalle completo de un producto, para precargar el formulario de edición. */
  async detalle(id: string): Promise<ProductoAdmin> {
    return this.uow.transaccion(async (repos) => {
      const producto = await repos.productos.buscarPorId(id);
      if (producto === null) throw new ProductoAdminNoEncontrado();
      return producto;
    });
  }
}
