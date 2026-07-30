import { randomBytes, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { LineaConJuego, TramoDescuento } from '../../domain/carrito';
import { PedidoPendienteExistente } from '../../domain/errores';
import type { EstadoPedido, NuevoPedido, PedidoParaPago } from '../../domain/pedido';
import type {
  AuditoriaCheckout,
  CarritoCheckout,
  OutboxCheckout,
  PagoRepositorio,
  PedidoRepositorio,
  ReposCheckout,
  StockRepositorio,
  UnidadDeTrabajoCompras,
} from '../../domain/ports/checkout.repository';

// Un encargado tiene dos carritos vivos: personal e institucional (CU-24). La unicidad usa dos
// índices —compuesto e índice parcial para el personal—, así que el upsert elige el árbitro.
const CONFLICTO_PERSONAL = 'ON CONFLICT (user_id) WHERE institution_context_id IS NULL';
const CONFLICTO_INSTITUCIONAL = 'ON CONFLICT (user_id, institution_context_id)';

function nuevoNumero(): string {
  return `ACA-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
}

class PedidoRepositorioPg implements PedidoRepositorio {
  constructor(private readonly db: PoolClient) {}

  async crear(datos: NuevoPedido): Promise<{ id: string; numero: string }> {
    const numero = nuevoNumero();
    let id: string;
    try {
      const r = await this.db.query<{ id: string }>(
        // `estado`, `envio_origen` y `expira_en` conservan su nombre: quedaron fuera de la
        // etapa 1c (el remapeo de estados depende de CU-12 A3, y envio_origen guarda qué
        // adaptador cotizó, no el transportista).
        `INSERT INTO orders
           (order_number, order_type, user_id, cart_id,
            shipping_street, shipping_number, shipping_city, shipping_province, shipping_postal_code,
            shipping_method, shipping_cost, envio_origen, total_amount)
         VALUES ($1, 'personal', $2, $3, $4, $5, $6, $7, $8, $9, $10, 'tabla_local', $11)
         RETURNING id`,
        [
          numero,
          datos.cuenta_id,
          datos.carrito_id,
          datos.domicilio_snapshot.calle,
          datos.domicilio_snapshot.numero,
          datos.domicilio_snapshot.localidad,
          datos.domicilio_snapshot.provincia,
          datos.domicilio_snapshot.codigo_postal,
          datos.envio_modalidad,
          datos.envio_costo,
          datos.monto_total,
        ],
      );
      id = r.rows[0]!.id;
    } catch (e) {
      // Idempotencia por pedido (CU-12): el índice parcial admite un solo pedido pendiente de
      // pago por carrito-origen. Se compara el nombre exacto del índice —no una subcadena— para
      // que un renombre no vuelva a degradar este 409 en un 500.
      const err = e as { code?: string; constraint?: string };
      if (err.code === '23505' && err.constraint === 'uq_orders_pending_per_cart') {
        throw new PedidoPendienteExistente();
      }
      throw e;
    }
    for (const l of datos.lineas) {
      await this.db.query(
        `INSERT INTO order_items
           (order_id, product_id, product_name_snapshot, quantity, unit_price, discount_applied)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, l.juego_id, l.nombre_snapshot, l.cantidad, l.precio_unitario_snapshot, l.descuento_pct_snapshot],
      );
    }
    return { id, numero };
  }

  async buscarParaPago(pedidoId: string): Promise<PedidoParaPago | null> {
    const r = await this.db.query<{
      id: string;
      numero: string;
      estado: EstadoPedido;
      monto_total: number;
      carrito_id: string | null;
      email: string;
      lineas: { juego_id: string; cantidad: number }[];
    }>(
      `SELECT p.id, p.order_number AS numero, p.estado, p.total_amount::float8 AS monto_total,
              p.cart_id AS carrito_id, u.email,
              COALESCE(
                json_agg(json_build_object('juego_id', pl.product_id, 'cantidad', pl.quantity) ORDER BY pl.id)
                  FILTER (WHERE pl.id IS NOT NULL), '[]'
              ) AS lineas
         FROM orders p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN order_items pl ON pl.order_id = p.id
        WHERE p.id = $1
        GROUP BY p.id, p.order_number, p.estado, p.total_amount, p.cart_id, u.email`,
      [pedidoId],
    );
    return r.rows[0] ?? null;
  }

  async transicionar(pedidoId: string, origen: EstadoPedido, destino: EstadoPedido): Promise<boolean> {
    const r = await this.db.query(
      `UPDATE orders SET estado = $3, updated_at = now()
        WHERE id = $1 AND estado = $2`,
      [pedidoId, origen, destino],
    );
    return (r.rowCount ?? 0) > 0;
  }
}

class StockRepositorioPg implements StockRepositorio {
  constructor(private readonly db: PoolClient) {}

  async decrementar(juegoId: string, cantidad: number): Promise<boolean> {
    const r = await this.db.query(
      `UPDATE products SET stock = stock - $2
        WHERE id = $1 AND stock >= $2`,
      [juegoId, cantidad],
    );
    return (r.rowCount ?? 0) > 0;
  }

  async movimientoVenta(juegoId: string, cantidad: number, referencia: string): Promise<void> {
    await this.db.query(
      `INSERT INTO stock_movements (product_id, movement_type, quantity, reference)
       VALUES ($1, 'venta', $2, $3)`,
      [juegoId, -cantidad, referencia],
    );
  }
}

class PagoRepositorioPg implements PagoRepositorio {
  constructor(private readonly db: PoolClient) {}

  async registrar(datos: {
    paymentId: string;
    pedidoId: string;
    estadoMp: string;
    monto: number;
    payload: Record<string, unknown>;
  }): Promise<boolean> {
    const r = await this.db.query(
      `INSERT INTO processed_payments (payment_id, order_id, status, notified_amount, raw_payload)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (payment_id) DO NOTHING`,
      [datos.paymentId, datos.pedidoId, datos.estadoMp, datos.monto, JSON.stringify(datos.payload)],
    );
    return (r.rowCount ?? 0) > 0;
  }
}

class CarritoCheckoutPg implements CarritoCheckout {
  constructor(private readonly db: PoolClient) {}

  private async asegurar(cuentaId: string, contexto: string | null): Promise<string> {
    const r = await this.db.query<{ id: string }>(
      `INSERT INTO carts (user_id, institution_context_id)
       VALUES ($1, $2)
       ${contexto === null ? CONFLICTO_PERSONAL : CONFLICTO_INSTITUCIONAL}
       DO UPDATE SET updated_at = now()
       RETURNING id`,
      [cuentaId, contexto],
    );
    return r.rows[0]!.id;
  }

  async leer(
    cuentaId: string,
    contexto: string | null,
  ): Promise<{ carritoId: string; lineas: LineaConJuego[] }> {
    const carritoId = await this.asegurar(cuentaId, contexto);
    const r = await this.db.query<LineaConJuego & { tramos: TramoDescuento[] }>(
      // Δ2 · un solo tramo de descuento, en columnas del producto (CU-10/CU-22).
      `SELECT cl.product_id AS juego_id, p.name AS nombre, cl.quantity AS cantidad,
              p.price::float8 AS precio_lista, p.stock AS stock_actual,
              CASE WHEN p.wholesale_threshold IS NOT NULL THEN
                json_build_array(json_build_object(
                  'cantidad_minima', p.wholesale_threshold,
                  'descuento_pct', p.wholesale_discount_percent))
              ELSE '[]'::json END AS tramos
         FROM cart_items cl
         JOIN products p ON p.id = cl.product_id AND p.is_active = true
        WHERE cl.cart_id = $1
        ORDER BY cl.created_at`,
      [carritoId],
    );
    return { carritoId, lineas: r.rows };
  }

  async vaciar(carritoId: string): Promise<void> {
    await this.db.query(`DELETE FROM cart_items WHERE cart_id = $1`, [carritoId]);
  }
}

class OutboxCheckoutPg implements OutboxCheckout {
  constructor(private readonly db: PoolClient) {}

  async encolar(email: {
    tipo: string;
    destinatario: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO outbox_emails (email_id, tipo, destinatario, payload)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [randomUUID(), email.tipo, email.destinatario, JSON.stringify(email.payload)],
    );
  }
}

class AuditoriaCheckoutPg implements AuditoriaCheckout {
  constructor(private readonly db: PoolClient) {}

  async registrar(evento: {
    tipo: string;
    sujetoId: string;
    datos?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO eventos_auditoria (tipo, sujeto_tipo, sujeto_id, datos)
       VALUES ($1, 'pedido', $2, $3::jsonb)`,
      [evento.tipo, evento.sujetoId, JSON.stringify(evento.datos ?? {})],
    );
  }
}

/**
 * Unit of Work de Compras (ADR-002): una transacción para el checkout/pago. Provee los repos
 * ligados al mismo cliente; commit total o rollback total.
 */
export class UnidadDeTrabajoComprasPg implements UnidadDeTrabajoCompras {
  constructor(private readonly pool: Pool) {}

  async transaccion<T>(fn: (repos: ReposCheckout) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const repos: ReposCheckout = {
        pedidos: new PedidoRepositorioPg(client),
        stock: new StockRepositorioPg(client),
        pagos: new PagoRepositorioPg(client),
        carrito: new CarritoCheckoutPg(client),
        outbox: new OutboxCheckoutPg(client),
        auditoria: new AuditoriaCheckoutPg(client),
      };
      const resultado = await fn(repos);
      await client.query('COMMIT');
      return resultado;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
