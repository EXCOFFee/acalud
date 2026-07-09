import type {
  CotizacionEnvio,
  CotizarInput,
  EventoTracking,
  ShippingProvider,
} from '../../domain/ports/shipping-provider.port';

/**
 * Adapter FAKE de MiCorreo (ambiente test). Determinista (CU-011: la tarifa de la demo debe
 * ser determinista). El adapter REST real (cotización + tracking) llega en la Etapa 3.
 */
export class MiCorreoFakeAdapter implements ShippingProvider {
  async cotizar(input: CotizarInput): Promise<CotizacionEnvio> {
    const kilos = Math.ceil(input.peso_gramos / 1000);
    return { monto: 800 + kilos * 350, origen: 'micorreo' };
  }

  async consultarTracking(numero_tracking: string): Promise<EventoTracking[]> {
    return [
      { fecha: '2026-01-01T09:00:00Z', descripcion: `Pieza ${numero_tracking} admitida` },
      { fecha: '2026-01-02T14:00:00Z', descripcion: 'En distribución' },
    ];
  }
}
