/**
 * CU-11 RN-002: peso declarado de los productos, insumo del cálculo de envío. Vive en `compras`
 * (no se importa `catalogo`: la regla de fronteras prohíbe cruzar módulos) con SQL directo sobre
 * `products`, mismo precedente que otros accesos de solo lectura entre BCs de este proyecto.
 */
export interface EnvioRepository {
  /** Gramos por producto; `null` si el producto no tiene peso cargado o no existe (A5). */
  obtenerPesos(productoIds: string[]): Promise<Map<string, number | null>>;
}

export const ENVIO_REPOSITORY = Symbol('EnvioRepository');
