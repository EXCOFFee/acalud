import { Logger } from '@nestjs/common';
import type { PaymentProvider } from '../domain/ports/payment-provider.port';
import { MercadoPagoAdapter } from './adapters/mercado-pago.adapter';

const logger = new Logger('PaymentProviderFactory');

/**
 * Selección del `PaymentProvider` (ADR-006): adapter **fijo** (Mercado Pago Checkout Pro), sin
 * fallback — a diferencia de Email/Shipping, este puerto no cae a un fake en runtime si faltan
 * credenciales; el checkout ya convierte cualquier fallo en `PagoIndisponible` (503). El fake
 * (`MercadoPagoFakeAdapter`) sigue existiendo solo como fixture de tests de integración,
 * inyectado por DI override, nunca a través de este factory.
 */
export function crearPaymentProvider(env: NodeJS.ProcessEnv = process.env): PaymentProvider {
  const accessToken = env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    logger.warn('MP_ACCESS_TOKEN no está definido. El PaymentProvider fallará al usarse.');
  }
  const webBaseUrl = env.WEB_BASE_URL ?? 'http://localhost:3001';
  const apiBaseUrl = env.RENDER_EXTERNAL_URL ?? env.API_BASE_URL ?? 'http://localhost:3000';
  return new MercadoPagoAdapter({
    accessToken: accessToken ?? '',
    webBaseUrl,
    notificationUrl: `${apiBaseUrl}/api/v1/webhooks/mercadopago`,
  });
}
