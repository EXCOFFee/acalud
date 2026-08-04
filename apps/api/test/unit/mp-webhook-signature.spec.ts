import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { firmaWebhookMpEsValida } from '../../src/platform/security/mp-webhook-signature';

const SECRET = 'secreto-de-prueba';

function firmar(dataId: string, xRequestId: string, ts: string, secret = SECRET): string {
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hash = createHmac('sha256', secret).update(manifest).digest('hex');
  return `ts=${ts},v1=${hash}`;
}

describe('firmaWebhookMpEsValida (CU-12 RN-004/RNF-002/A7)', () => {
  it('acepta una firma calculada con el mismo manifest y secreto', () => {
    const xSignature = firmar('123456789', 'req-1', '1700000000000');
    expect(
      firmaWebhookMpEsValida({ xSignature, xRequestId: 'req-1', dataId: '123456789', secret: SECRET }),
    ).toBe(true);
  });

  it('rechaza si el secreto no coincide', () => {
    const xSignature = firmar('123456789', 'req-1', '1700000000000', 'otro-secreto');
    expect(
      firmaWebhookMpEsValida({ xSignature, xRequestId: 'req-1', dataId: '123456789', secret: SECRET }),
    ).toBe(false);
  });

  it('rechaza si el data.id no coincide con el firmado (forgery)', () => {
    const xSignature = firmar('123456789', 'req-1', '1700000000000');
    expect(
      firmaWebhookMpEsValida({ xSignature, xRequestId: 'req-1', dataId: 'otro-id', secret: SECRET }),
    ).toBe(false);
  });

  it('rechaza si falta el header x-signature', () => {
    expect(
      firmaWebhookMpEsValida({ xSignature: undefined, xRequestId: 'req-1', dataId: '1', secret: SECRET }),
    ).toBe(false);
  });

  it('rechaza un header malformado (sin v1)', () => {
    expect(
      firmaWebhookMpEsValida({
        xSignature: 'ts=1700000000000',
        xRequestId: 'req-1',
        dataId: '1',
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it('rechaza si falta el secreto configurado', () => {
    const xSignature = firmar('123456789', 'req-1', '1700000000000');
    expect(
      firmaWebhookMpEsValida({ xSignature, xRequestId: 'req-1', dataId: '123456789', secret: '' }),
    ).toBe(false);
  });
});
