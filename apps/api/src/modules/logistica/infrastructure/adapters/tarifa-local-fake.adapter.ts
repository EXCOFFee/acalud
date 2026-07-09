import type {
  CotizacionEnvio,
  CotizarInput,
  EventoTracking,
  ShippingProvider,
} from '../../domain/ports/shipping-provider.port';

/**
 * Adapter FAKE de la Tabla de tarifas local (fallback de ShippingProvider, ADR-006).
 * Peso × zona → precio, determinista. La tabla local no provee tracking externo.
 */
export class TarifaLocalFakeAdapter implements ShippingProvider {
  async cotizar(input: CotizarInput): Promise<CotizacionEnvio> {
    const kilos = Math.ceil(input.peso_gramos / 1000);
    return { monto: 700 + kilos * 300, origen: 'tabla_local' };
  }

  async consultarTracking(_numero_tracking: string): Promise<EventoTracking[]> {
    return [];
  }
}
