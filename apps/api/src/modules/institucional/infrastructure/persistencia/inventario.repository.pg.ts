import type { PoolClient } from 'pg';
import type {
  CompraHistorial,
  DetalleProductoInstitucional,
  DocenteAsignado,
  FiltroInventario,
  InventarioRepository,
  ItemInventario,
  MembresiaInstitucional,
  OrdenInventario,
  ResumenInventario,
} from '../../domain/ports/inventario.repository';

/**
 * Estados de orden que representan una compra efectiva (CU-25 RN-007): pagada o posterior.
 * Un pedido `pending`/`cancelled`/`under_review` nunca fue una compra.
 */
const ESTADOS_COMPRA = `('paid', 'shipped', 'delivered')`;

/**
 * Whitelist de orden (CU-25 A6): el valor del query param NUNCA se interpola en el SQL.
 * Sólo la EXPRESIÓN va acá: la dirección y el `NULLS LAST` los agrega `listar`, porque
 * PostgreSQL exige el orden `expr [ASC|DESC] [NULLS …]` y al revés es un error de sintaxis.
 */
const COLUMNA_ORDEN: Record<OrdenInventario, string> = {
  cantidad_adquirida: 'ii.quantity_purchased',
  cantidad_asignada: 'ii.quantity_assigned',
  cantidad_disponible: '(ii.quantity_purchased - ii.quantity_assigned)',
  ultima_compra: 'hist.ultima_compra_en',
  nombre: 'p.name',
};

export class InventarioRepositoryPg implements InventarioRepository {
  constructor(private readonly client: PoolClient) {}

  async buscarMembresiaActiva(
    institucionId: string,
    usuarioId: string,
  ): Promise<MembresiaInstitucional | null> {
    const r = await this.client.query<{ id: string; is_admin: boolean }>(
      `SELECT id, is_admin
         FROM institutional_teachers
        WHERE institution_id = $1 AND user_id = $2 AND status = 'active'`,
      [institucionId, usuarioId],
    );
    const fila = r.rows[0];
    if (!fila) return null;
    return { id: fila.id, esAdmin: fila.is_admin };
  }

  async listar(institucionId: string, filtro: FiltroInventario): Promise<ItemInventario[]> {
    const params: unknown[] = [institucionId];
    let condicionProducto = '';
    if (filtro.productoId !== undefined) {
      params.push(filtro.productoId);
      condicionProducto = 'AND ii.product_id = $2';
    }
    const columna = COLUMNA_ORDEN[filtro.orden ?? 'nombre'];
    const direccion = filtro.direccion === 'desc' ? 'DESC' : 'ASC';

    const r = await this.client.query<{
      product_id: string;
      name: string;
      description: string | null;
      quantity_purchased: number;
      quantity_assigned: number;
      ultima_compra_en: Date | null;
      total_gastado: number | null;
    }>(
      `SELECT ii.product_id, p.name, p.description,
              ii.quantity_purchased, ii.quantity_assigned,
              hist.ultima_compra_en, hist.total_gastado
         FROM institutional_inventories ii
         JOIN products p ON p.id = ii.product_id
         LEFT JOIN LATERAL (
           SELECT MAX(o.created_at) AS ultima_compra_en,
                  SUM(oi.unit_price * oi.quantity)::float8 AS total_gastado
             FROM orders o
             JOIN order_items oi ON oi.order_id = o.id
            WHERE o.institution_id = ii.institution_id
              AND oi.product_id = ii.product_id
              AND o.order_type = 'b2b'
              AND o.status IN ${ESTADOS_COMPRA}
         ) hist ON true
        WHERE ii.institution_id = $1
        ${condicionProducto}
        ORDER BY ${columna} ${direccion} NULLS LAST`,
      params,
    );

    return r.rows.map((fila) => ({
      productoId: fila.product_id,
      nombreProducto: fila.name,
      descripcionProducto: fila.description,
      cantidadAdquirida: fila.quantity_purchased,
      cantidadAsignada: fila.quantity_assigned,
      // CU-25 RN-002: disponible = adquirida − asignada.
      cantidadDisponible: fila.quantity_purchased - fila.quantity_assigned,
      ultimaCompraEn: fila.ultima_compra_en,
      totalGastado: fila.total_gastado,
    }));
  }

  async resumen(institucionId: string): Promise<ResumenInventario> {
    const r = await this.client.query<{
      total_adquiridas: number;
      total_en_uso: number;
      total_disponibles: number;
      docentes_asignados: number;
    }>(
      `SELECT COALESCE(SUM(ii.quantity_purchased), 0)::int  AS total_adquiridas,
              COALESCE(SUM(ii.quantity_assigned), 0)::int   AS total_en_uso,
              COALESCE(SUM(ii.quantity_purchased - ii.quantity_assigned), 0)::int AS total_disponibles,
              (
                SELECT COUNT(DISTINCT a.institutional_teacher_id)
                  FROM institutional_assignments a
                 WHERE a.institution_id = $1 AND a.status = 'active'
              )::int AS docentes_asignados
         FROM institutional_inventories ii
        WHERE ii.institution_id = $1`,
      [institucionId],
    );
    const fila = r.rows[0]!;
    return {
      totalAdquiridas: fila.total_adquiridas,
      docentesConAsignaciones: fila.docentes_asignados,
      totalEnUso: fila.total_en_uso,
      totalDisponibles: fila.total_disponibles,
    };
  }

  async detalle(
    institucionId: string,
    productoId: string,
  ): Promise<DetalleProductoInstitucional | null> {
    const prod = await this.client.query<{
      id: string;
      name: string;
      description: string | null;
      precio: number;
      quantity_purchased: number;
      quantity_assigned: number;
    }>(
      `SELECT p.id, p.name, p.description, p.price::float8 AS precio,
              ii.quantity_purchased, ii.quantity_assigned
         FROM institutional_inventories ii
         JOIN products p ON p.id = ii.product_id
        WHERE ii.institution_id = $1 AND ii.product_id = $2`,
      [institucionId, productoId],
    );
    const p = prod.rows[0];
    if (!p) return null;

    const compras = await this.client.query<{
      orden_id: string;
      numero: string;
      fecha: Date;
      cantidad: number;
      monto: number;
    }>(
      `SELECT o.id AS orden_id, o.order_number AS numero, o.created_at AS fecha,
              oi.quantity AS cantidad, (oi.unit_price * oi.quantity)::float8 AS monto
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
        WHERE o.institution_id = $1
          AND oi.product_id = $2
          AND o.order_type = 'b2b'
          AND o.status IN ${ESTADOS_COMPRA}
        ORDER BY o.created_at DESC`,
      [institucionId, productoId],
    );

    const docentes = await this.client.query<{
      docente_id: string;
      nombre: string;
      cantidad: number;
      asignada_en: Date;
      estado: 'active' | 'revoked';
    }>(
      // CU-28 RN-007: el detalle muestra TODAS las asignaciones, también las revocadas.
      `SELECT u.id AS docente_id, u.full_name AS nombre,
              a.quantity_assigned AS cantidad, a.assigned_at AS asignada_en, a.status AS estado
         FROM institutional_assignments a
         JOIN institutional_teachers it ON it.id = a.institutional_teacher_id
         JOIN users u ON u.id = it.user_id
        WHERE a.institution_id = $1 AND a.product_id = $2
        ORDER BY a.assigned_at DESC`,
      [institucionId, productoId],
    );

    return {
      productoId: p.id,
      nombreProducto: p.name,
      descripcionProducto: p.description,
      precio: p.precio,
      cantidadAdquirida: p.quantity_purchased,
      cantidadAsignada: p.quantity_assigned,
      cantidadDisponible: p.quantity_purchased - p.quantity_assigned,
      compras: compras.rows.map(
        (c): CompraHistorial => ({
          ordenId: c.orden_id,
          numero: c.numero,
          fecha: c.fecha,
          cantidad: c.cantidad,
          monto: c.monto,
        }),
      ),
      docentes: docentes.rows.map(
        (d): DocenteAsignado => ({
          docenteId: d.docente_id,
          nombre: d.nombre,
          cantidad: d.cantidad,
          asignadaEn: d.asignada_en,
          estado: d.estado,
        }),
      ),
    };
  }
}
