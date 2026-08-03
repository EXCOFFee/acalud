import type {
  CotizacionEnvio,
  CotizarInput,
  ResultadoTracking,
  ShippingProvider,
} from '../../domain/ports/shipping-provider.port';

/**
 * Adapter FAKE de la Tabla de tarifas local (fallback de ShippingProvider, ADR-006).
 * Peso × zona → precio, determinista. La tabla local no provee tracking externo: a diferencia
 * de MiCorreo, no hay ningún servicio detrás para consultar, así que `consultarTracking` lanza
 * (CU-13 A3) en vez de devolver una respuesta vacía — es una falla real, no "sin eventos".
 */
export class TarifaLocalFakeAdapter implements ShippingProvider {
  async cotizar(input: CotizarInput): Promise<CotizacionEnvio> {
    const kilos = Math.ceil(input.peso_gramos / 1000);
    return { monto: 700 + kilos * 300, origen: 'local_fallback' };
  }

  async consultarTracking(_numero_tracking: string): Promise<ResultadoTracking> {
    throw new Error('La tabla de tarifas local no provee seguimiento de envíos');
  }
}
