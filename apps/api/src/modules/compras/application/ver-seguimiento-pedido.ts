import { OrdenNoEncontrada, PedidoNoDespachado, PedidoSinTracking, ProveedorLogisticoNoDisponible } from '../domain/errores';
import type { EventoTrackingCacheado, TrackingRepository } from '../domain/ports/tracking.repository';
import type { SeguimientoPedido } from '../domain/seguimiento';
import type { ShippingProvider } from '../domain/ports/shipping-provider.port';

const TTL_CACHE_MS = 5 * 60 * 1000; // RN-003 / RNF-002

/**
 * CU-13 · Seguir Pedido Logístico (flujo principal + A1, A3, A4, A6, A10; RN-003/RNF-002 caché,
 * RNF-007 fallback ante falla del proveedor, RN-008 auto-entrega). A8 (acceso por link de email)
 * y A9 (rate limiting) quedan fuera de esta unidad.
 */
export class VerSeguimientoPedido {
  constructor(
    private readonly repo: TrackingRepository,
    private readonly shippingProvider: ShippingProvider,
  ) {}

  async ejecutar(usuarioId: string, ordenId: string): Promise<SeguimientoPedido> {
    const orden = await this.repo.buscarOrdenPropia(usuarioId, ordenId);
    if (!orden) throw new OrdenNoEncontrada(); // recurso ajeno = 404

    if (orden.trackingCode === null) throw new PedidoSinTracking(); // A1
    if (orden.estado !== 'shipped' && orden.estado !== 'delivered') {
      throw new PedidoNoDespachado(); // A4
    }

    const cache = await this.repo.obtenerEventosCacheados(orden.id);
    const ultimoFetch = cache.at(-1)?.fetchedAt;
    if (ultimoFetch && Date.now() - ultimoFetch.getTime() < TTL_CACHE_MS) {
      return this.desdeCache(cache); // RN-003: caché vigente, no repite la consulta
    }

    try {
      const resultado = await this.shippingProvider.consultarTracking(orden.trackingCode);

      await this.repo.reemplazarEventos(
        orden.id,
        resultado.eventos.map((e) => ({
          estado: e.estado,
          ubicacion: e.ubicacion,
          descripcion: e.descripcion,
          fecha: e.fecha ? new Date(e.fecha) : null,
        })),
      );

      // RN-008: la confirmación de entrega actualiza la orden aunque el usuario nunca haya
      // tocado nada más — el frontend no distingue "consultar" de "confirmar entrega".
      if (resultado.estadoActual === 'delivered' && orden.estado !== 'delivered') {
        await this.repo.marcarEntregada(orden.id);
      }

      return {
        estadoActual: resultado.estadoActual,
        eventos: resultado.eventos.map((e) => ({
          estado: e.estado,
          ubicacion: e.ubicacion,
          descripcion: e.descripcion,
          fecha: e.fecha,
        })),
        fechaEstimadaEntrega: resultado.fechaEstimadaEntrega,
        direccionEntrega: resultado.direccionEntrega,
        ultimaActualizacion: resultado.ultimaActualizacion,
        desdeCache: false,
      };
    } catch {
      // RNF-007: sin respuesta del proveedor, se exhibe el último estado conocido si existe.
      if (cache.length > 0) return this.desdeCache(cache);
      throw new ProveedorLogisticoNoDisponible(); // A3, sin nada que mostrar
    }
  }

  private desdeCache(cache: EventoTrackingCacheado[]): SeguimientoPedido {
    return {
      estadoActual: cache.at(-1)!.estado, // A6-style: el más reciente por fecha de evento
      eventos: cache.map((e) => ({
        estado: e.estado,
        ubicacion: e.ubicacion,
        descripcion: e.descripcion,
        fecha: e.fecha ? e.fecha.toISOString() : null,
      })),
      fechaEstimadaEntrega: null,
      direccionEntrega: null,
      ultimaActualizacion: cache.at(-1)!.fetchedAt.toISOString(),
      desdeCache: true,
    };
  }
}
