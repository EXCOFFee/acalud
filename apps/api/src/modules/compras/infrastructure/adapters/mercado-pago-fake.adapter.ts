import type {
  CrearPreferenciaInput,
  PagoExterno,
  PaymentProvider,
  PreferenciaDePago,
} from '../../domain/ports/payment-provider.port';

/**
 * Adapter FAKE de Mercado Pago (sandbox) para destrabar el esqueleto E2E (Etapa 1).
 * Determinista: crea una preferencia predecible y "aprueba" el pago. El adapter real
 * (Checkout Pro + webhook firmado + reconciliación server-to-server) llega en la Etapa 3.
 */
export class MercadoPagoFakeAdapter implements PaymentProvider {
  async crearPreferencia(input: CrearPreferenciaInput): Promise<PreferenciaDePago> {
    return {
      preferencia_id: `fake-pref-${input.pedido_id}`,
      init_point: `https://fake.mercadopago.local/checkout/${input.pedido_id}`,
    };
  }

  async consultarPago(payment_id: string): Promise<PagoExterno> {
    return { payment_id, estado: 'approved', monto: 0 };
  }
}
