import type { DemoAdmin } from '../demo-admin';

/** Puerto de ABM de demos (CU-19 A8): una demo por producto (`uq_demos_product`), alta = edición. */
export interface DemosAdminRepository {
  upsert(productId: string, configJson: Record<string, unknown>): Promise<DemoAdmin>;
  /** null si el producto todavía no tiene demo asignada. Para precargar el form de edición. */
  buscarPorProducto(productId: string): Promise<DemoAdmin | null>;
}
