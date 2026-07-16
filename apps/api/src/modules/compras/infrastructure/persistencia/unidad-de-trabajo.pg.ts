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

const CTX_NULO = '00000000-0000-0000-0000-000000000000';

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
        `INSERT INTO pedidos
           (numero, comprador_tipo, cuenta_id, carrito_id, domicilio_snapshot,
            envio_modalidad, envio_costo, envio_origen, monto_total)
         VALUES ($1, 'personal', $2, $3, $4::jsonb, $5, $6, 'tabla_local', $7)
         RETURNING id`,
        [
          numero,
          datos.cuenta_id,
          datos.carrito_id,
          JSON.stringify(datos.domicilio_snapshot),
          datos.envio_modalidad,
          datos.envio_costo,
          datos.monto_total,
        ],
      );
      id = r.rows[0]!.id;
    } catch (e) {
      const err = e as { code?: string; constraint?: string; message?: string };
      if (err.code === '23505' && /pendiente/.test(`${err.constraint ?? ''} ${err.message ?? ''}`)) {
        throw new PedidoPendienteExistente();
      }
      throw e;
    }
    for (const l of datos.lineas) {
      await this.db.query(
        `INSERT INTO pedido_lineas
           (pedido_id, juego_id, nombre_snapshot, cantidad, precio_unitario_snapshot, descuento_pct_snapshot)
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
      `SELECT p.id, p.numero, p.estado, p.monto_total::float8 AS monto_total, p.carrito_id, c.email,
              COALESCE(
                json_agg(json_build_object('juego_id', pl.juego_id, 'cantidad', pl.cantidad) ORDER BY pl.id)
                  FILTER (WHERE pl.id IS NOT NULL), '[]'
              ) AS lineas
         FROM pedidos p
         JOIN cuentas c ON c.id = p.cuenta_id
         LEFT JOIN pedido_lineas pl ON pl.pedido_id = p.id
        WHERE p.id = $1
        GROUP BY p.id, p.numero, p.estado, p.monto_total, p.carrito_id, c.email`,
      [pedidoId],
    );
    return r.rows[0] ?? null;
  }

  async transicionar(pedidoId: string, origen: EstadoPedido, destino: EstadoPedido): Promise<boolean> {
    const r = await this.db.query(
      `UPDATE pedidos SET estado = $3, actualizado_en = now()
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
      `UPDATE juegos SET stock_actual = stock_actual - $2
        WHERE id = $1 AND stock_actual >= $2`,
      [juegoId, cantidad],
    );
    return (r.rowCount ?? 0) > 0;
  }

  async movimientoVenta(juegoId: string, cantidad: number, referencia: string): Promise<void> {
    await this.db.query(
      `INSERT INTO movimientos_stock (juego_id, tipo, cantidad_signada, referencia)
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
      `INSERT INTO pagos_procesados (payment_id, pedido_id, estado_mp, monto_notificado, payload_crudo)
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
      `INSERT INTO carritos (cuenta_id, contexto_institucion_id)
       VALUES ($1, $2)
       ON CONFLICT (cuenta_id, COALESCE(contexto_institucion_id, '${CTX_NULO}'::uuid))
       DO UPDATE SET actualizado_en = now()
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
      `SELECT cl.juego_id, j.nombre, cl.cantidad,
              j.precio_lista::float8 AS precio_lista, j.stock_actual,
              COALESCE(
                json_agg(json_build_object('cantidad_minima', td.cantidad_minima, 'descuento_pct', td.descuento_pct)
                  ORDER BY td.cantidad_minima) FILTER (WHERE td.id IS NOT NULL), '[]'
              ) AS tramos
         FROM carrito_lineas cl
         JOIN juegos j ON j.id = cl.juego_id AND j.publicado = true AND j.eliminado_en IS NULL
         LEFT JOIN tramos_descuento td ON td.juego_id = j.id
        WHERE cl.carrito_id = $1
        GROUP BY cl.juego_id, j.nombre, cl.cantidad, j.precio_lista, j.stock_actual, cl.creado_en
        ORDER BY cl.creado_en`,
      [carritoId],
    );
    return { carritoId, lineas: r.rows };
  }

  async vaciar(carritoId: string): Promise<void> {
    await this.db.query(`DELETE FROM carrito_lineas WHERE carrito_id = $1`, [carritoId]);
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
