import type {
  CrearPreferenciaInput,
  EstadoPagoExterno,
  PagoExterno,
  PaymentProvider,
  PreferenciaDePago,
} from '../../domain/ports/payment-provider.port';

const TIMEOUT_MS = 10_000; // ADR-006: 10 s explícitos para Mercado Pago, sin timeout por defecto.
const BASE_URL = 'https://api.mercadopago.com';

export interface ConfigMercadoPago {
  readonly accessToken: string;
  /** Base pública del frontend, para armar `back_urls` (ej: https://acalud.vercel.app). */
  readonly webBaseUrl: string;
  /** URL pública y completa del webhook (ej: https://acalud-api.onrender.com/api/v1/webhooks/mercadopago). */
  readonly notificationUrl: string;
}

const ESTADO_MP: Record<string, EstadoPagoExterno> = {
  approved: 'approved',
  rejected: 'rejected',
  cancelled: 'rejected',
};

/**
 * Adapter real de `PaymentProvider` vía la API HTTP de Mercado Pago — Checkout Pro (ADR-006).
 * Sin SDK del proveedor (mismo criterio que `GmailApiAdapter`): `fetch` nativo + timeout
 * explícito. Selección fija (ADR-006: "sin fallback"; a diferencia de Email/Shipping, este
 * puerto no cae a un fake en runtime — si falta configuración, la llamada falla con un error
 * claro y `IniciarCheckout` lo convierte en `PagoIndisponible`, 503).
 */
export class MercadoPagoAdapter implements PaymentProvider {
  constructor(private readonly config: ConfigMercadoPago) {}

  private async solicitar(path: string, init: RequestInit): Promise<Response> {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);
    try {
      return await fetch(`${BASE_URL}${path}`, {
        ...init,
        signal: controlador.signal,
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
          ...init.headers,
        },
      });
    } finally {
      clearTimeout(temporizador);
    }
  }

  async crearPreferencia(input: CrearPreferenciaInput): Promise<PreferenciaDePago> {
    const resultado = `${this.config.webBaseUrl}/checkout/resultado?pedido_id=${input.pedido_id}`;
    const res = await this.solicitar('/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify({
        // El puerto solo expone un monto/descripción agregados (no líneas de carrito) — un
        // único ítem sintético alcanza para lo que Checkout Pro exige (title/quantity/unit_price).
        items: [{ title: input.descripcion, quantity: 1, unit_price: input.monto_total }],
        external_reference: input.pedido_id,
        notification_url: this.config.notificationUrl,
        back_urls: { success: resultado, failure: resultado, pending: resultado },
        auto_return: 'approved',
      }),
    });
    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      throw new Error(`Mercado Pago crearPreferencia ${res.status}: ${detalle.slice(0, 200)}`);
    }
    const data = (await res.json()) as { id: string; init_point: string };
    return { preferencia_id: data.id, init_point: data.init_point };
  }

  async consultarPago(payment_id: string): Promise<PagoExterno> {
    const res = await this.solicitar(`/v1/payments/${payment_id}`, { method: 'GET' });
    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      throw new Error(`Mercado Pago consultarPago ${res.status}: ${detalle.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      status: string;
      transaction_amount: number;
      external_reference: string;
    };
    return {
      payment_id,
      estado: ESTADO_MP[data.status] ?? 'pending',
      monto: data.transaction_amount,
      referencia_externa: data.external_reference,
    };
  }
}
