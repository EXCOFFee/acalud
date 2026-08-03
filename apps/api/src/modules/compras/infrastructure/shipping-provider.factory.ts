import type { ShippingProvider } from '../domain/ports/shipping-provider.port';
import { MiCorreoFakeAdapter } from './adapters/micorreo-fake.adapter';
import { TarifaLocalFakeAdapter } from './adapters/tarifa-local-fake.adapter';

/**
 * Selección del `ShippingProvider` por variable de entorno (ADR-006):
 * `SHIPPING_ADAPTER=micorreo` → MiCorreo; cualquier otro valor (incl. `tabla`, el default de
 * .env.example) → Tabla local. La conmutación automática por timeout/circuit-breaker es de la
 * Etapa 3.
 */
export function crearShippingProvider(env: NodeJS.ProcessEnv = process.env): ShippingProvider {
  return env.SHIPPING_ADAPTER === 'micorreo'
    ? new MiCorreoFakeAdapter()
    : new TarifaLocalFakeAdapter();
}
