/** Campos del formulario de alta/edición de producto (CU-19 p6, enumeración cerrada). */
export interface DatosProducto {
  name: string;
  description: string;
  price: number;
  stock: number;
  isOwnBrand: boolean;
  externalUrl: string | null;
  categoryId: string | null;
  wholesaleThreshold: number | null;
  wholesaleDiscountPercent: number | null;
  imageUrl: string | null;
}

/** Producto tal como lo devuelve el panel de administración (incluye campos de sistema). */
export interface ProductoAdmin extends DatosProducto {
  id: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
