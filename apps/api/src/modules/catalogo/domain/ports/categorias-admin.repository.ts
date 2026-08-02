import type { CategoriaAdmin } from '../categoria-admin';

/** Puerto de ABM de categorías (CU-19 A7). */
export interface CategoriasAdminRepository {
  listar(): Promise<CategoriaAdmin[]>;
  crear(nombre: string): Promise<CategoriaAdmin>;
  /** null si el `id` no corresponde a ninguna categoría. */
  actualizar(id: string, nombre: string): Promise<CategoriaAdmin | null>;
  /** `products.category_id` es `ON DELETE SET NULL`: no hay guarda de "en uso" que respetar. */
  eliminar(id: string): Promise<boolean>;
}
