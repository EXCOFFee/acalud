import { randomBytes } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { renderizar } from '../../../../platform/outbox/plantillas';
import type { LineaConJuego, TramoDescuento } from '../../domain/carrito';
import { PedidoPendienteExistente } from '../../domain/errores';
import type { EstadoPedido, NuevoPedido, PedidoParaPago } from '../../domain/pedido';
import type {
  AuditoriaCheckout,
  CarritoCheckout,
  InventarioInstitucionalCheckout,
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

/**
 * Nombres exactos de objetos y valores de la base de los que depende este adapter. Están acá,
 * en un solo lugar, para que un renombre en una migración se refleje en un punto y no rompa en
 * silencio: así fue como el 409 de "pago en curso" degradó a 500 al renombrar su índice.
 * Prohibido comparar subcadenas de mensajes de error.
 */
const PG_VIOLACION_UNICIDAD = '23505';
const IDX_UN_PEDIDO_PENDIENTE_POR_CARRITO = 'uq_orders_pending_per_cart';
const VALOR_ORDER_TYPE_B2C = 'b2c';
const VALOR_ORDER_TYPE_B2B = 'b2b';
const VALOR_ORIGEN_COTIZACION_LOCAL = 'local_fallback';
const VALOR_MOVIMIENTO_VENTA = 'sale';

function nuevoNumero(): string {
  return `ACA-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
}

class PedidoRepositorioPg implements PedidoRepositorio {
  constructor(private readonly db: PoolClient) {}

  async crear(datos: NuevoPedido): Promise<{ id: string; numero: string }> {
    const numero = nuevoNumero();
    // CHECK ck_orders_buyer_coherence: b2b exige institution_id no nulo, b2c lo exige nulo.
    const orderType = datos.institution_id !== null ? VALOR_ORDER_TYPE_B2B : VALOR_ORDER_TYPE_B2C;
    let id: string;
    try {
      const r = await this.db.query<{ id: string }>(
        // `shipping_quote_source` guarda qué adaptador cotizó, no el transportista:
        // `shipping_carrier` es un campo distinto que entra con CU-13.
        `INSERT INTO orders
           (order_number, order_type, user_id, institution_id, cart_id,
            shipping_street, shipping_number, shipping_city, shipping_province, shipping_postal_code,
            shipping_method, shipping_cost, shipping_quote_source, total_amount, billing_data)
         VALUES ($1, $13::order_type, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $14::shipping_quote_source, $12, $15::jsonb)
         RETURNING id`,
        [
          numero,
          datos.cuenta_id,
          datos.institution_id,
          datos.carrito_id,
          datos.domicilio_snapshot.calle,
          datos.domicilio_snapshot.numero,
          datos.domicilio_snapshot.localidad,
          datos.domicilio_snapshot.provincia,
          datos.domicilio_snapshot.codigo_postal,
          datos.envio_modalidad,
          datos.envio_costo,
          datos.monto_total,
          orderType,
          VALOR_ORIGEN_COTIZACION_LOCAL,
          datos.billing_data ? JSON.stringify(datos.billing_data) : null,
        ],
      );
      id = r.rows[0]!.id;
    } catch (e) {
      // Idempotencia por pedido (CU-12): el índice parcial admite un solo pedido pendiente de
      // pago por carrito-origen. Se compara el nombre exacto del índice —no una subcadena— para
      // que un renombre no vuelva a degradar este 409 en un 500.
      const err = e as { code?: string; constraint?: string };
      if (err.code === PG_VIOLACION_UNICIDAD && err.constraint === IDX_UN_PEDIDO_PENDIENTE_POR_CARRITO) {
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
      institution_id: string | null;
      lineas: { juego_id: string; cantidad: number }[];
    }>(
      `SELECT p.id, p.order_number AS numero, p.status AS estado, p.total_amount::float8 AS monto_total,
              p.cart_id AS carrito_id, p.institution_id, u.email,
              COALESCE(
                json_agg(json_build_object('juego_id', pl.product_id, 'cantidad', pl.quantity) ORDER BY pl.id)
                  FILTER (WHERE pl.id IS NOT NULL), '[]'
              ) AS lineas
         FROM orders p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN order_items pl ON pl.order_id = p.id
        WHERE p.id = $1
        GROUP BY p.id, p.order_number, p.status, p.total_amount, p.cart_id, p.institution_id, u.email`,
      [pedidoId],
    );
    return r.rows[0] ?? null;
  }

  async transicionar(
    pedidoId: string,
    origen: EstadoPedido,
    destino: EstadoPedido,
    paymentIdMp?: string,
  ): Promise<boolean> {
    const r = await this.db.query(
      // Guarda de máquina de estados (ADR-002): prohibido el UPDATE directo del estado.
      `UPDATE orders SET status = $3::order_status, payment_id_mp = COALESCE($4, payment_id_mp), updated_at = now()
        WHERE id = $1 AND status = $2::order_status`,
      [pedidoId, origen, destino, paymentIdMp ?? null],
    );
    return (r.rowCount ?? 0) > 0;
  }

  async guardarPreferencia(pedidoId: string, preferenciaId: string): Promise<void> {
    await this.db.query('UPDATE orders SET payment_preference_id = $2 WHERE id = $1', [
      pedidoId,
      preferenciaId,
    ]);
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
       VALUES ($1, $4::stock_movement_type, $2, $3)`,
      [juegoId, -cantidad, referencia, VALOR_MOVIMIENTO_VENTA],
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

  async esEncargadoActivo(userId: string, institutionId: string): Promise<boolean> {
    const r = await this.db.query(
      `SELECT 1 FROM institutional_teachers
        WHERE institution_id = $1 AND user_id = $2 AND is_admin = true AND status = 'active'`,
      [institutionId, userId],
    );
    return r.rows.length > 0;
  }

  /** CU-24 RN-007: mismo precedente que `esEncargadoActivo` de leer `institutions` desde Compras. */
  async datosFacturacion(institutionId: string): Promise<{ razonSocial: string; cuit: string } | null> {
    const r = await this.db.query<{ legal_name: string; tax_id: string }>(
      `SELECT legal_name, tax_id FROM institutions WHERE id = $1`,
      [institutionId],
    );
    const fila = r.rows[0];
    return fila ? { razonSocial: fila.legal_name, cuit: fila.tax_id } : null;
  }
}

class InventarioInstitucionalCheckoutPg implements InventarioInstitucionalCheckout {
  constructor(private readonly db: PoolClient) {}

  async sumarComprado(institutionId: string, productId: string, cantidad: number): Promise<void> {
    // Cierra D-32: confirmado el pago B2B, acumula lo adquirido (UNIQUE institution_id+product_id).
    await this.db.query(
      `INSERT INTO institutional_inventories (institution_id, product_id, quantity_purchased)
       VALUES ($1, $2, $3)
       ON CONFLICT (institution_id, product_id)
       DO UPDATE SET quantity_purchased = institutional_inventories.quantity_purchased + EXCLUDED.quantity_purchased`,
      [institutionId, productId, cantidad],
    );
  }
}

class OutboxCheckoutPg implements OutboxCheckout {
  constructor(private readonly db: PoolClient) {}

  async encolar(email: {
    tipo: string;
    destinatario: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    // El mensaje se guarda ya renderizado: la fila del outbox queda completa e inmutable dentro
    // de la misma transacción del pago (ver OutboxRepositoryPg).
    const plantilla = renderizar(email.tipo, email.payload);
    if (plantilla === null) throw new Error(`tipo de email sin plantilla: ${email.tipo}`);

    await this.db.query(
      `INSERT INTO outbox_emails (template, recipient, subject, body)
       VALUES ($1, $2, $3, $4)`,
      [email.tipo, email.destinatario, plantilla.asunto, plantilla.html],
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
      `INSERT INTO audit_log (action, entity_type, entity_id, new_values)
       VALUES ($1, 'order', $2, $3::jsonb)`,
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
        inventarioInstitucional: new InventarioInstitucionalCheckoutPg(client),
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
