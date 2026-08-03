import type { Pool, PoolClient } from 'pg';
import type { EstadoPedido } from '../../domain/pedido';
import type {
  EventoTrackingCacheado,
  NuevoEventoTracking,
  OrdenParaTracking,
  TrackingRepository,
} from '../../domain/ports/tracking.repository';

type Ejecutor = Pool | PoolClient;

export class TrackingRepositoryPg implements TrackingRepository {
  constructor(private readonly db: Ejecutor) {}

  async buscarOrdenPropia(usuarioId: string, ordenId: string): Promise<OrdenParaTracking | null> {
    const r = await this.db.query<{ id: string; status: EstadoPedido; tracking_code: string | null }>(
      `SELECT id, status, tracking_code FROM orders WHERE id = $1 AND user_id = $2`,
      [ordenId, usuarioId],
    );
    const fila = r.rows[0];
    if (!fila) return null;
    return { id: fila.id, estado: fila.status, trackingCode: fila.tracking_code };
  }

  async obtenerEventosCacheados(ordenId: string): Promise<EventoTrackingCacheado[]> {
    const r = await this.db.query<{
      status: string;
      location: string | null;
      description: string;
      event_date: Date | null;
      fetched_at: Date;
    }>(
      `SELECT status, location, description, event_date, fetched_at
         FROM order_tracking_events
        WHERE order_id = $1
        ORDER BY event_date ASC NULLS LAST, fetched_at ASC`,
      [ordenId],
    );
    return r.rows.map((f) => ({
      estado: f.status,
      ubicacion: f.location,
      descripcion: f.description,
      fecha: f.event_date,
      fetchedAt: f.fetched_at,
    }));
  }

  // El proveedor devuelve la cronología completa en cada consulta (D-25: la tabla es caché E
  // historial a la vez): se reemplaza el snapshot en vez de acumular filas duplicadas.
  async reemplazarEventos(ordenId: string, eventos: NuevoEventoTracking[]): Promise<void> {
    await this.db.query(`DELETE FROM order_tracking_events WHERE order_id = $1`, [ordenId]);
    for (const evento of eventos) {
      await this.db.query(
        `INSERT INTO order_tracking_events (order_id, status, location, description, event_date)
         VALUES ($1, $2, $3, $4, $5)`,
        [ordenId, evento.estado, evento.ubicacion, evento.descripcion, evento.fecha],
      );
    }
  }

  async marcarEntregada(ordenId: string): Promise<void> {
    await this.db.query(`UPDATE orders SET status = 'delivered' WHERE id = $1`, [ordenId]);
  }
}
