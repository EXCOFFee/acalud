import type { EmailProvider } from './email-provider.port';
import { EmailFakeAdapter } from './adapters/email-fake.adapter';

/**
 * Selección del `EmailProvider` (ADR-006): adapter fijo (Resend/Brevo, a decidir en 5.1).
 * La Etapa 0/1 usa el fake.
 */
export function crearEmailProvider(): EmailProvider {
  return new EmailFakeAdapter();
}
