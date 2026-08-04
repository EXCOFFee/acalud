import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verificación de la firma de un webhook de Mercado Pago (CU-12 RN-004/RNF-002/A7).
 *
 * Algoritmo verificado contra el código fuente oficial de `mercadopago/sdk-nodejs`
 * (`src/utils/webhook/index.ts`), no documentado con precisión en la doc pública:
 *  - Header `x-signature`: `ts=<epoch_ms>,v1=<hmac_hex>` (orden de claves no garantizado).
 *  - Manifest: `id:<dataId>;request-id:<xRequestId>;ts:<ts>;` — los pares con valor ausente se
 *    omiten, `ts` siempre va. `dataId` es el query param `data.id` de la notificación (NO el
 *    body: la firma no cubre el body).
 *  - HMAC-SHA256 hex de ese manifest con `MP_WEBHOOK_SECRET` como clave, comparado contra `v1`
 *    en tiempo constante.
 */
export function firmaWebhookMpEsValida(input: {
  xSignature: string | undefined;
  xRequestId: string | undefined;
  dataId: string | undefined;
  secret: string;
}): boolean {
  if (!input.xSignature || !input.secret) return false;

  let ts: string | undefined;
  let hashV1: string | undefined;
  for (const parte of input.xSignature.split(',')) {
    const [clave, valor] = parte.split('=').map((s) => s.trim());
    if (clave === 'ts') ts = valor;
    else if (clave === 'v1') hashV1 = valor;
  }
  if (!ts || !hashV1) return false;

  const partes: string[] = [];
  if (input.dataId) partes.push(`id:${input.dataId}`);
  if (input.xRequestId) partes.push(`request-id:${input.xRequestId}`);
  partes.push(`ts:${ts}`);
  const manifest = partes.join(';') + ';';

  const calculado = createHmac('sha256', input.secret).update(manifest).digest('hex');

  const a = Buffer.from(calculado);
  const b = Buffer.from(hashV1);
  return a.length === b.length && timingSafeEqual(a, b);
}
