import { CategoriaInvalida, ProductoAdminNoEncontrado } from '../domain/errores';
import type { UnidadDeTrabajoCatalogoAdmin } from '../domain/ports/catalogo-admin.uow';
import type { DatosProducto, ProductoAdmin } from '../domain/producto-admin';
import type { StorageProvider } from '../../../platform/storage/storage-provider.port';

const BUCKET_IMAGENES = 'productos';

export interface ActualizarProductoInput extends DatosProducto {
  adminId: string;
}

/**
 * CU-19 A1 · Edición de producto existente. El formulario se reenvía completo (p17: "mismo que
 * pasos 10-14"), así que la validación de campos es la misma que en el alta.
 */
export class ActualizarProducto {
  constructor(
    private readonly uow: UnidadDeTrabajoCatalogoAdmin,
    private readonly storage: StorageProvider,
  ) {}

  async ejecutar(id: string, input: ActualizarProductoInput): Promise<ProductoAdmin> {
    const { producto, imagenAnterior } = await this.uow.transaccion(async (repos) => {
      if (input.categoryId !== null) {
        const existe = await repos.productos.existeCategoria(input.categoryId);
        if (!existe) throw new CategoriaInvalida();
      }

      const anterior = await repos.productos.buscarPorId(id);
      const actualizado = await repos.productos.actualizar(id, input);
      if (actualizado === null) throw new ProductoAdminNoEncontrado();

      await repos.auditoria.registrar({
        tipo: 'update',
        sujetoTipo: 'product',
        sujetoId: actualizado.id,
        actorId: input.adminId,
        datos: { name: actualizado.name, price: actualizado.price, stock: actualizado.stock },
      });

      return { producto: actualizado, imagenAnterior: anterior?.imageUrl ?? null };
    });

    // Borrado best-effort de la imagen reemplazada: no bloquea la respuesta si falla, y nunca
    // toca una URL externa pegada a mano (solo lo que subimos nosotros al bucket 'productos').
    if (imagenAnterior && imagenAnterior !== producto.imageUrl) {
      const path = this.storage.extraerPathPropio(BUCKET_IMAGENES, imagenAnterior);
      if (path) void this.storage.eliminarArchivo(BUCKET_IMAGENES, path).catch(() => undefined);
    }

    return producto;
  }
}
