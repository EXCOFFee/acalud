import { CategoriaInvalida, ProductoAdminNoEncontrado } from '../domain/errores';
import type { UnidadDeTrabajoCatalogoAdmin } from '../domain/ports/catalogo-admin.uow';
import type { DatosProducto, ProductoAdmin } from '../domain/producto-admin';

export interface ActualizarProductoInput extends DatosProducto {
  adminId: string;
}

/**
 * CU-19 A1 · Edición de producto existente. El formulario se reenvía completo (p17: "mismo que
 * pasos 10-14"), así que la validación de campos es la misma que en el alta.
 */
export class ActualizarProducto {
  constructor(private readonly uow: UnidadDeTrabajoCatalogoAdmin) {}

  async ejecutar(id: string, input: ActualizarProductoInput): Promise<ProductoAdmin> {
    return this.uow.transaccion(async (repos) => {
      if (input.categoryId !== null) {
        const existe = await repos.productos.existeCategoria(input.categoryId);
        if (!existe) throw new CategoriaInvalida();
      }

      const producto = await repos.productos.actualizar(id, input);
      if (producto === null) throw new ProductoAdminNoEncontrado();

      await repos.auditoria.registrar({
        tipo: 'update',
        sujetoTipo: 'product',
        sujetoId: producto.id,
        actorId: input.adminId,
        datos: { name: producto.name, price: producto.price, stock: producto.stock },
      });

      return producto;
    });
  }
}
