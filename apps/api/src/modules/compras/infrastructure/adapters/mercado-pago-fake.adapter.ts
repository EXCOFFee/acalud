import type {
  CrearPreferenciaInput,
  PagoExterno,
  PaymentProvider,
  PreferenciaDePago,
} from '../../domain/ports/payment-provider.port';

const PREFIJO_PAGO = 'fake-pay-';
const PREFIJO_RECHAZO = 'fake-reject-';

/**
 * Adapter FAKE de Mercado Pago (sandbox) para el esqueleto E2E (Etapa 1). Determinista y
 * *stateful*: al crear la preferencia guarda el monto del pedido (como haría MP), y al
 * "consultar" el pago devuelve ese mismo monto + `external_reference` = pedido_id y estado
 * `approved`. Así el flujo fake respeta la forma del real (reconciliación server-to-server +
 * validación de monto contra el snapshot). El adapter real (Checkout Pro + webhook firmado)
 * llega en la Etapa 3. `payment_id` = `fake-pay-<pedido_id>`.
 */
export class MercadoPagoFakeAdapter implements PaymentProvider {
  private readonly montoPorPedido = new Map<string, number>();

  async crearPreferencia(input: CrearPreferenciaInput): Promise<PreferenciaDePago> {
    this.montoPorPedido.set(input.pedido_id, input.monto_total);
    return {
      preferencia_id: `fake-pref-${input.pedido_id}`,
      init_point: `https://fake.mercadopago.local/checkout/${input.pedido_id}`,
    };
  }

  async consultarPago(payment_id: string): Promise<PagoExterno> {
    const rechazado = payment_id.startsWith(PREFIJO_RECHAZO);
    const prefijo = rechazado ? PREFIJO_RECHAZO : PREFIJO_PAGO;
    const pedidoId = payment_id.startsWith(prefijo)
      ? payment_id.slice(prefijo.length)
      : payment_id;
    return {
      payment_id,
      estado: rechazado ? 'rejected' : 'approved',
      monto: this.montoPorPedido.get(pedidoId) ?? 0,
      referencia_externa: pedidoId,
    };
  }

  /** Helper de test/demo: el payment_id aprobado determinista de un pedido. */
  static paymentIdDe(pedidoId: string): string {
    return `${PREFIJO_PAGO}${pedidoId}`;
  }

  /** Helper de test: un payment_id que el fake reporta como rechazado. */
  static paymentRechazadoDe(pedidoId: string): string {
    return `${PREFIJO_RECHAZO}${pedidoId}`;
  }
}
