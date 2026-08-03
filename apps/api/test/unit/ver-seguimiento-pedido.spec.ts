import { describe, expect, it } from 'vitest';
import { VerSeguimientoPedido } from '../../src/modules/compras/application/ver-seguimiento-pedido';
import {
  OrdenNoEncontrada,
  PedidoNoDespachado,
  PedidoSinTracking,
  ProveedorLogisticoNoDisponible,
} from '../../src/modules/compras/domain/errores';
import type {
  EventoTrackingCacheado,
  NuevoEventoTracking,
  OrdenParaTracking,
  TrackingRepository,
} from '../../src/modules/compras/domain/ports/tracking.repository';
import type { ResultadoTracking, ShippingProvider } from '../../src/modules/compras/domain/ports/shipping-provider.port';

class TrackingRepositoryFake implements TrackingRepository {
  orden: OrdenParaTracking | null = null;
  cache: EventoTrackingCacheado[] = [];
  reemplazados: NuevoEventoTracking[] | null = null;
  entregada = false;

  async buscarOrdenPropia(): Promise<OrdenParaTracking | null> {
    return this.orden;
  }
  async obtenerEventosCacheados(): Promise<EventoTrackingCacheado[]> {
    return this.cache;
  }
  async reemplazarEventos(_ordenId: string, eventos: NuevoEventoTracking[]): Promise<void> {
    this.reemplazados = eventos;
  }
  async marcarEntregada(): Promise<void> {
    this.entregada = true;
  }
}

class ShippingProviderFake implements ShippingProvider {
  resultado: ResultadoTracking | null = null;
  error: Error | null = null;

  async cotizar(): Promise<never> {
    throw new Error('no usado en este test');
  }
  async consultarTracking(): Promise<ResultadoTracking> {
    if (this.error) throw this.error;
    return this.resultado!;
  }
}

const ORDEN_BASE: OrdenParaTracking = { id: 'orden-1', estado: 'shipped', trackingCode: 'CA123AR' };

const RESULTADO_BASE: ResultadoTracking = {
  estadoActual: 'in_transit',
  eventos: [{ fecha: '2026-01-01T00:00:00Z', estado: 'admitted', ubicacion: 'CABA', descripcion: 'Admitida' }],
  fechaEstimadaEntrega: '2026-01-05T00:00:00Z',
  direccionEntrega: 'Calle Falsa 123',
  ultimaActualizacion: '2026-01-01T00:00:00Z',
};

describe('VerSeguimientoPedido (CU-13)', () => {
  it('A1: sin tracking_code lanza PedidoSinTracking', async () => {
    const repo = new TrackingRepositoryFake();
    repo.orden = { ...ORDEN_BASE, trackingCode: null };
    const uc = new VerSeguimientoPedido(repo, new ShippingProviderFake());
    await expect(uc.ejecutar('u1', 'orden-1')).rejects.toBeInstanceOf(PedidoSinTracking);
  });

  it('A4: estado "paid" (no despachado) lanza PedidoNoDespachado', async () => {
    const repo = new TrackingRepositoryFake();
    repo.orden = { ...ORDEN_BASE, estado: 'paid' };
    const uc = new VerSeguimientoPedido(repo, new ShippingProviderFake());
    await expect(uc.ejecutar('u1', 'orden-1')).rejects.toBeInstanceOf(PedidoNoDespachado);
  });

  it('orden ajena o inexistente lanza OrdenNoEncontrada', async () => {
    const repo = new TrackingRepositoryFake();
    repo.orden = null;
    const uc = new VerSeguimientoPedido(repo, new ShippingProviderFake());
    await expect(uc.ejecutar('u1', 'orden-1')).rejects.toBeInstanceOf(OrdenNoEncontrada);
  });

  it('flujo principal: consulta al proveedor, persiste eventos y devuelve datos frescos', async () => {
    const repo = new TrackingRepositoryFake();
    repo.orden = ORDEN_BASE;
    const shipping = new ShippingProviderFake();
    shipping.resultado = RESULTADO_BASE;
    const uc = new VerSeguimientoPedido(repo, shipping);

    const resultado = await uc.ejecutar('u1', 'orden-1');

    expect(resultado.desdeCache).toBe(false);
    expect(resultado.estadoActual).toBe('in_transit');
    expect(resultado.fechaEstimadaEntrega).toBe('2026-01-05T00:00:00Z');
    expect(repo.reemplazados).toHaveLength(1);
    expect(repo.entregada).toBe(false); // RN-008 no dispara si no está "delivered"
  });

  it('RN-008: si el proveedor confirma "delivered", marca la orden como entregada', async () => {
    const repo = new TrackingRepositoryFake();
    repo.orden = ORDEN_BASE;
    const shipping = new ShippingProviderFake();
    shipping.resultado = { ...RESULTADO_BASE, estadoActual: 'delivered' };
    const uc = new VerSeguimientoPedido(repo, shipping);

    await uc.ejecutar('u1', 'orden-1');

    expect(repo.entregada).toBe(true);
  });

  it('RN-008: si ya estaba "delivered", no vuelve a marcarla', async () => {
    const repo = new TrackingRepositoryFake();
    repo.orden = { ...ORDEN_BASE, estado: 'delivered' };
    const shipping = new ShippingProviderFake();
    shipping.resultado = { ...RESULTADO_BASE, estadoActual: 'delivered' };
    const uc = new VerSeguimientoPedido(repo, shipping);

    await uc.ejecutar('u1', 'orden-1');

    expect(repo.entregada).toBe(false);
  });

  it('RN-003/RNF-002: con caché vigente (< 5 min) no vuelve a consultar al proveedor', async () => {
    const repo = new TrackingRepositoryFake();
    repo.orden = ORDEN_BASE;
    repo.cache = [
      { estado: 'in_transit', ubicacion: 'CABA', descripcion: 'cacheado', fecha: new Date(), fetchedAt: new Date() },
    ];
    const shipping = new ShippingProviderFake();
    shipping.error = new Error('no debería llamarse'); // si se llama, el test falla
    const uc = new VerSeguimientoPedido(repo, shipping);

    const resultado = await uc.ejecutar('u1', 'orden-1');

    expect(resultado.desdeCache).toBe(true);
    expect(resultado.eventos[0]!.descripcion).toBe('cacheado');
  });

  it('RNF-007: si el proveedor falla pero hay caché (aunque vencida), devuelve el último estado conocido', async () => {
    const repo = new TrackingRepositoryFake();
    repo.orden = ORDEN_BASE;
    const vencido = new Date(Date.now() - 10 * 60 * 1000); // 10 min: vencido para RN-003
    repo.cache = [
      { estado: 'in_transit', ubicacion: 'CABA', descripcion: 'último conocido', fecha: vencido, fetchedAt: vencido },
    ];
    const shipping = new ShippingProviderFake();
    shipping.error = new Error('proveedor caído');
    const uc = new VerSeguimientoPedido(repo, shipping);

    const resultado = await uc.ejecutar('u1', 'orden-1');

    expect(resultado.desdeCache).toBe(true);
    expect(resultado.eventos[0]!.descripcion).toBe('último conocido');
  });

  it('A3: si el proveedor falla y no hay ninguna caché, lanza ProveedorLogisticoNoDisponible', async () => {
    const repo = new TrackingRepositoryFake();
    repo.orden = ORDEN_BASE;
    repo.cache = [];
    const shipping = new ShippingProviderFake();
    shipping.error = new Error('proveedor caído');
    const uc = new VerSeguimientoPedido(repo, shipping);

    await expect(uc.ejecutar('u1', 'orden-1')).rejects.toBeInstanceOf(ProveedorLogisticoNoDisponible);
  });
});
