import type { Pool, PoolClient } from 'pg';
import type { LineaConJuego, TramoDescuento } from '../../domain/carrito';
import type { CarritoRepository } from '../../domain/ports/carrito.repository';

type Ejecutor = Pool | PoolClient;

// Sentinela del índice único funcional de carritos (contexto NULL normalizado).
const CTX_NULO = '00000000-0000-0000-0000-000000000000';

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
    const r = await this.db.query<{ id: string }>(
      `INSERT INTO carritos (cuenta_id, contexto_institucion_id)
       VALUES ($1, $2)
       ON CONFLICT (cuenta_id, COALESCE(contexto_institucion_id, '${CTX_NULO}'::uuid))
       DO UPDATE SET actualizado_en = now()
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
      `SELECT cl.juego_id, p.name AS nombre, cl.cantidad,
              p.price::float8 AS precio_lista, p.stock AS stock_actual,
              CASE WHEN p.wholesale_threshold IS NOT NULL THEN
                json_build_array(json_build_object(
                  'cantidad_minima', p.wholesale_threshold,
                  'descuento_pct', p.wholesale_discount_percent))
              ELSE '[]'::json END AS tramos
         FROM carrito_lineas cl
         JOIN products p ON p.id = cl.juego_id
        WHERE cl.carrito_id = $1
        ORDER BY cl.creado_en`,
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
      `INSERT INTO carrito_lineas (carrito_id, juego_id, cantidad)
       VALUES ($1, $2, $3)
       ON CONFLICT (carrito_id, juego_id) DO UPDATE SET cantidad = EXCLUDED.cantidad`,
      [carritoId, juegoId, cantidad],
    );
  }

  async quitarLinea(cuentaId: string, contexto: string | null, juegoId: string): Promise<void> {
    const carritoId = await this.asegurarCarrito(cuentaId, contexto);
    await this.db.query(`DELETE FROM carrito_lineas WHERE carrito_id = $1 AND juego_id = $2`, [
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
}
