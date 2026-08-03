import type {
  CotizacionEnvio,
  CotizarInput,
  ResultadoTracking,
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

  async consultarTracking(numero_tracking: string): Promise<ResultadoTracking> {
    return {
      estadoActual: 'in_transit',
      eventos: [
        {
          fecha: '2026-01-01T09:00:00Z',
          estado: 'admitted',
          ubicacion: 'CEDI Buenos Aires',
          descripcion: `Pieza ${numero_tracking} admitida`,
        },
        {
          fecha: '2026-01-02T14:00:00Z',
          estado: 'in_transit',
          ubicacion: 'Centro de distribución local',
          descripcion: 'En distribución',
        },
      ],
      fechaEstimadaEntrega: '2026-01-05T00:00:00Z',
      direccionEntrega: 'Domicilio del destinatario',
      ultimaActualizacion: new Date().toISOString(),
    };
  }
}
