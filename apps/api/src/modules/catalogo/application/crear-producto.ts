import { CategoriaInvalida } from '../domain/errores';
import type { UnidadDeTrabajoCatalogoAdmin } from '../domain/ports/catalogo-admin.uow';
import type { DatosProducto, ProductoAdmin } from '../domain/producto-admin';

export interface CrearProductoInput extends DatosProducto {
  adminId: string;
}

/**
 * CU-19 · Alta de producto (flujo principal). RN-003/004/005/006/007 se validan en el borde
 * (Zod, `admin-catalogo.esquemas.ts`); acá sólo queda lo que depende de la base: que la
 * categoría exista.
 */
export class CrearProducto {
  constructor(private readonly uow: UnidadDeTrabajoCatalogoAdmin) {}

  async ejecutar(input: CrearProductoInput): Promise<ProductoAdmin> {
    return this.uow.transaccion(async (repos) => {
      if (input.categoryId !== null) {
        const existe = await repos.productos.existeCategoria(input.categoryId);
        if (!existe) throw new CategoriaInvalida();
      }

      const producto = await repos.productos.crear(input);

      // RN-002 / poscondición: admin_id, action, product_id y timestamp (este último, por defecto de la BD).
      await repos.auditoria.registrar({
        tipo: 'create',
        sujetoTipo: 'product',
        sujetoId: producto.id,
        actorId: input.adminId,
        datos: { name: producto.name, price: producto.price, stock: producto.stock },
      });

      return producto;
    });
  }
}
