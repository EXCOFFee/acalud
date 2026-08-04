import type { Pool, PoolClient } from 'pg';
import type { DatosFacturacion, EstadoPedido } from '../../domain/pedido';
import type { DetalleOrdenHistorial, FiltroHistorial, HistorialRepository, OrdenHistorial, ResultadoPaginado, TipoOrden } from '../../domain/ports/historial.repository';

type Ejecutor = Pool | PoolClient;

export class HistorialRepositoryPg implements HistorialRepository {
  constructor(private readonly db: Ejecutor) {}

  async listar(usuarioId: string, filtro: FiltroHistorial): Promise<ResultadoPaginado<OrdenHistorial>> {
    const page = filtro.pagina && filtro.pagina > 0 ? filtro.pagina : 1;
    const limit = filtro.limite && filtro.limite > 0 ? filtro.limite : 20;
    const offset = (page - 1) * limit;

    const values: unknown[] = [usuarioId];
    let where = 'WHERE user_id = $1';

    if (filtro.estado) {
      values.push(filtro.estado);
      where += ` AND status = $${values.length}`;
    }

    if (filtro.order_type) {
      values.push(filtro.order_type);
      where += ` AND order_type = $${values.length}`;
    }

    const orderCol = filtro.orden_por === 'total_amount' ? 'total_amount' : 'created_at';
    const orderDir = filtro.orden_dir === 'asc' ? 'ASC' : 'DESC';

    // Para obtener el total usamos window functions y lo sacamos de la primera fila o con count()
    const countQuery = `SELECT COUNT(*)::int as total FROM orders ${where}`;
    const countResult = await this.db.query<{ total: number }>(countQuery, values);
    const total_items = countResult.rows[0]?.total ?? 0;

    const total_paginas = Math.ceil(total_items / limit);

    const dataQuery = `
      SELECT id, order_number as numero, created_at as fecha, total_amount::float8 as total,
             status as estado, tracking_code, order_type, institution_id
      FROM orders
      ${where}
      ORDER BY ${orderCol} ${orderDir}
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    const dataValues = [...values, limit, offset];
    const dataResult = await this.db.query<{
      id: string;
      numero: string;
      fecha: Date;
      total: number;
      estado: EstadoPedido;
      tracking_code: string | null;
      order_type: TipoOrden;
      institution_id: string | null;
    }>(dataQuery, dataValues);

    const items: OrdenHistorial[] = dataResult.rows.map((row) => ({
      id: row.id,
      numero: row.numero,
      fecha: row.fecha,
      total: row.total,
      estado: row.estado,
      tracking_code: row.tracking_code,
      order_type: row.order_type,
      institution_id: row.institution_id,
    }));

    return {
      items,
      total_items,
      total_paginas,
      pagina_actual: page,
    };
  }

  async detalle(usuarioId: string, ordenId: string): Promise<DetalleOrdenHistorial | null> {
    const r = await this.db.query<{
      id: string;
      numero: string;
      fecha: Date;
      estado: EstadoPedido;
      total: number;
      envio_costo: number;
      shipping_street: string | null;
      shipping_number: string | null;
      shipping_city: string | null;
      shipping_province: string | null;
      shipping_postal_code: string | null;
      tracking_code: string | null;
      order_type: TipoOrden;
      institution_id: string | null;
      billing_data: DatosFacturacion | null;
      lineas: { juego_id: string; nombre: string; cantidad: number; precio_unitario: number; descuento_pct: number }[];
    }>(
      `
      SELECT o.id, o.order_number as numero, o.created_at as fecha, o.status as estado,
             o.total_amount::float8 as total, o.shipping_cost::float8 as envio_costo,
             o.shipping_street, o.shipping_number, o.shipping_city, o.shipping_province, o.shipping_postal_code,
             o.tracking_code, o.order_type, o.institution_id, o.billing_data,
             COALESCE(
               json_agg(
                 json_build_object(
                   'juego_id', pl.product_id,
                   'nombre', pl.product_name_snapshot,
                   'cantidad', pl.quantity,
                   'precio_unitario', pl.unit_price::float8,
                   'descuento_pct', pl.discount_applied::float8
                 ) ORDER BY pl.id
               ) FILTER (WHERE pl.id IS NOT NULL), '[]'
             ) as lineas
      FROM orders o
      LEFT JOIN order_items pl ON pl.order_id = o.id
      WHERE o.id = $1 AND o.user_id = $2
      GROUP BY o.id
      `,
      [ordenId, usuarioId]
    );

    if (r.rows.length === 0) return null;
    const row = r.rows[0]!;

    const subtotal = row.total - row.envio_costo;

    return {
      id: row.id,
      numero: row.numero,
      fecha: row.fecha,
      estado: row.estado,
      subtotal,
      envio_costo: row.envio_costo,
      total: row.total,
      tracking_code: row.tracking_code,
      order_type: row.order_type,
      institution_id: row.institution_id,
      billing_data: row.billing_data,
      domicilio: {
        calle: row.shipping_street,
        numero: row.shipping_number,
        localidad: row.shipping_city,
        provincia: row.shipping_province,
        codigo_postal: row.shipping_postal_code,
      },
      lineas: row.lineas,
    };
  }
}
