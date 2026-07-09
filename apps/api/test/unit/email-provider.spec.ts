import { describe, expect, it } from 'vitest';
import { EmailFakeAdapter } from '../../src/platform/email/adapters/email-fake.adapter';
import { crearEmailProvider } from '../../src/platform/email/email-provider.factory';

describe('EmailProvider (puerto + fake, ADR-006)', () => {
  it('el fake confirma el envío y lo registra', async () => {
    const fake = new EmailFakeAdapter();
    const r = await fake.enviar({
      email_id: 'e-1',
      destinatario: 'maria@escuela.edu.ar',
      asunto: 'Confirmación de compra',
      cuerpo: '...',
    });
    expect(r).toEqual({ email_id: 'e-1', enviado: true, proveedor: 'fake' });
    expect(fake.enviados).toHaveLength(1);
  });

  it('la factory devuelve un EmailProvider', () => {
    expect(crearEmailProvider()).toBeInstanceOf(EmailFakeAdapter);
  });
});
