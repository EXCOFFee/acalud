import type { DatosProducto, ProductoAdmin } from '../producto-admin';

/** Puerto de escritura del catálogo (CU-19, solo Productos por ahora). */
export interface ProductosAdminRepository {
  crear(datos: DatosProducto): Promise<ProductoAdmin>;
  /** null si el `id` no corresponde a ningún producto (A1). */
  actualizar(id: string, datos: DatosProducto): Promise<ProductoAdmin | null>;
  /** Baja lógica (RNF-008): pone `is_active = false`. null si el `id` no existe (A2). */
  desactivar(id: string): Promise<ProductoAdmin | null>;
  existeCategoria(categoriaId: string): Promise<boolean>;
}
