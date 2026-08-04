import type { DatosProducto, ProductoAdmin } from '../producto-admin';

/** CU-19 p4: listado admin con búsqueda y paginación (incluye inactivos, a diferencia del catálogo público). */
export interface FiltroProductosAdmin {
  q?: string | undefined;
  pagina: number;
  tamanio: number;
}

/** Fila resumida del listado admin (p4) — también sirve al listado de A8.2 (`tieneDemo`). */
export interface ProductoAdminResumen {
  id: string;
  name: string;
  price: number;
  stock: number;
  isActive: boolean;
  tieneDemo: boolean;
  /** CU-22 A8/RNF-005: config mayorista visible en el listado (null = "Sin configuración"). */
  wholesaleThreshold: number | null;
  wholesaleDiscountPercent: number | null;
  /** CU-22 A11: para la advertencia de "producto con órdenes existentes" antes de guardar. */
  tieneOrdenes: boolean;
}

export interface PaginaProductosAdmin {
  datos: ProductoAdminResumen[];
  total: number;
}

/** Puerto de escritura del catálogo (CU-19, solo Productos por ahora). */
export interface ProductosAdminRepository {
  listar(filtro: FiltroProductosAdmin): Promise<PaginaProductosAdmin>;
  existeProducto(id: string): Promise<boolean>;
  /** Detalle completo para precargar el formulario de edición (F2). null si no existe. */
  buscarPorId(id: string): Promise<ProductoAdmin | null>;
  crear(datos: DatosProducto): Promise<ProductoAdmin>;
  /** null si el `id` no corresponde a ningún producto (A1). */
  actualizar(id: string, datos: DatosProducto): Promise<ProductoAdmin | null>;
  /** Baja lógica (RNF-008): pone `is_active = false`. null si el `id` no existe (A2). */
  desactivar(id: string): Promise<ProductoAdmin | null>;
  existeCategoria(categoriaId: string): Promise<boolean>;
}
