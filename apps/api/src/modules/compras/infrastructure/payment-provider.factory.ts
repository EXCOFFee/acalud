import type { PaymentProvider } from '../domain/ports/payment-provider.port';
import { MercadoPagoFakeAdapter } from './adapters/mercado-pago-fake.adapter';

/**
 * Selección del `PaymentProvider` (ADR-006): adapter fijo (Mercado Pago), sin fallback.
 * En la Etapa 0/1 devuelve el fake; el adapter sandbox real llega en la Etapa 3.
 */
export function crearPaymentProvider(): PaymentProvider {
  return new MercadoPagoFakeAdapter();
}
