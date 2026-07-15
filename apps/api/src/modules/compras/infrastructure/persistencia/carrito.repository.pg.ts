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
      `SELECT cl.juego_id, j.nombre, cl.cantidad,
              j.precio_lista::float8 AS precio_lista, j.stock_actual,
              COALESCE(
                json_agg(
                  json_build_object('cantidad_minima', td.cantidad_minima,
                                    'descuento_pct', td.descuento_pct)
                  ORDER BY td.cantidad_minima
                ) FILTER (WHERE td.id IS NOT NULL),
                '[]'
              ) AS tramos
         FROM carrito_lineas cl
         JOIN juegos j ON j.id = cl.juego_id
         LEFT JOIN tramos_descuento td ON td.juego_id = j.id
        WHERE cl.carrito_id = $1
        GROUP BY cl.juego_id, j.nombre, cl.cantidad, j.precio_lista, j.stock_actual, cl.creado_en
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
      `SELECT 1 FROM juegos WHERE id = $1 AND publicado = true AND eliminado_en IS NULL`,
      [juegoId],
    );
    return r.rows.length > 0;
  }
}
