import type { Pool, PoolClient } from 'pg';
import type { LineaConJuego, TramoDescuento } from '../../domain/carrito';
import type { CarritoRepository } from '../../domain/ports/carrito.repository';

type Ejecutor = Pool | PoolClient;

/**
 * Un docente encargado tiene dos carritos vivos a la vez: el personal y el institucional
 * (CU-24, "carrito institucional separado del carrito personal"). La unicidad se sostiene con
 * dos índices —compuesto para el institucional, parcial para el personal— porque en PostgreSQL
 * los NULL son distintos entre sí. El upsert elige el árbitro según el contexto.
 */
const CONFLICTO_PERSONAL = 'ON CONFLICT (user_id) WHERE institution_context_id IS NULL';
const CONFLICTO_INSTITUCIONAL = 'ON CONFLICT (user_id, institution_context_id)';

interface FilaLinea {
  juego_id: string;
  nombre: string;
  cantidad: number;
  precio_lista: number;
  stock_actual: number;
  tramos: TramoDescuento[];
}

export class CarritoRepositoryPg implements CarritoRepository {
  constructor(private readonly db: Ejecutor) {}

  /** Resuelve (o crea) el carrito de (cuenta, contexto) y devuelve su id. */
  private async asegurarCarrito(cuentaId: string, contexto: string | null): Promise<string> {
    const conflicto = contexto === null ? CONFLICTO_PERSONAL : CONFLICTO_INSTITUCIONAL;
    const r = await this.db.query<{ id: string }>(
      `INSERT INTO carts (user_id, institution_context_id)
       VALUES ($1, $2)
       ${conflicto}
       DO UPDATE SET updated_at = now()
       RETURNING id`,
      [cuentaId, contexto],
    );
    const fila = r.rows[0];
    if (fila === undefined) throw new Error('el upsert de carrito no devolvió id');
    return fila.id;
  }

  async verLineas(cuentaId: string, contexto: string | null): Promise<LineaConJuego[]> {
    const carritoId = await this.asegurarCarrito(cuentaId, contexto);
    const r = await this.db.query<FilaLinea>(
      // Δ2 · el descuento mayorista es un solo tramo, en columnas del producto (CU-10/CU-22).
      `SELECT cl.product_id AS juego_id, p.name AS nombre, cl.quantity AS cantidad,
              p.price::float8 AS precio_lista, p.stock AS stock_actual,
              CASE WHEN p.wholesale_threshold IS NOT NULL THEN
                json_build_array(json_build_object(
                  'cantidad_minima', p.wholesale_threshold,
                  'descuento_pct', p.wholesale_discount_percent))
              ELSE '[]'::json END AS tramos
         FROM cart_items cl
         JOIN products p ON p.id = cl.product_id
        WHERE cl.cart_id = $1
        ORDER BY cl.created_at`,
      [carritoId],
    );
    return r.rows;
  }

  async ponerLinea(
    cuentaId: string,
    contexto: string | null,
    juegoId: string,
    cantidad: number,
  ): Promise<void> {
    const carritoId = await this.asegurarCarrito(cuentaId, contexto);
    await this.db.query(
      `INSERT INTO cart_items (cart_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
      [carritoId, juegoId, cantidad],
    );
  }

  async quitarLinea(cuentaId: string, contexto: string | null, juegoId: string): Promise<void> {
    const carritoId = await this.asegurarCarrito(cuentaId, contexto);
    await this.db.query(`DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2`, [
      carritoId,
      juegoId,
    ]);
  }

  async juegoPublicado(juegoId: string): Promise<boolean> {
    const r = await this.db.query(
      `SELECT 1 FROM products WHERE id = $1 AND is_active = true`,
      [juegoId],
    );
    return r.rows.length > 0;
  }

  async esEncargadoActivo(userId: string, institutionId: string): Promise<boolean> {
    const r = await this.db.query(
      `SELECT 1 FROM institutional_teachers
        WHERE institution_id = $1 AND user_id = $2 AND is_admin = true AND status = 'active'`,
      [institutionId, userId],
    );
    return r.rows.length > 0;
  }
}
