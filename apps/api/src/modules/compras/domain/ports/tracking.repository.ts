import type { EstadoPedido } from '../pedido';

/** Datos de la orden necesarios para autorizar y resolver el seguimiento (CU-13). */
export interface OrdenParaTracking {
  id: string;
  estado: EstadoPedido;
  trackingCode: string | null;
}

/** Fila de `order_tracking_events` ya persistida. */
export interface EventoTrackingCacheado {
  estado: string;
  ubicacion: string | null;
  descripcion: string;
  fecha: Date | null;
  fetchedAt: Date;
}

export interface NuevoEventoTracking {
  estado: string;
  ubicacion: string | null;
  descripcion: string;
  fecha: Date | null;
}

export interface TrackingRepository {
  /** null si la orden no existe o no pertenece al usuario (recurso ajeno = 404, CU-13). */
  buscarOrdenPropia(usuarioId: string, ordenId: string): Promise<OrdenParaTracking | null>;
  /** Cronología ascendente (más antiguo primero) de la última consulta cacheada (RN-003/RNF-002/D-25). */
  obtenerEventosCacheados(ordenId: string): Promise<EventoTrackingCacheado[]>;
  /** Reemplaza el snapshot cacheado: el proveedor devuelve la cronología completa en cada consulta. */
  reemplazarEventos(ordenId: string, eventos: NuevoEventoTracking[]): Promise<void>;
  /** RN-008: la orden pasa a `delivered` si el proveedor confirma la entrega. */
  marcarEntregada(ordenId: string): Promise<void>;
}
