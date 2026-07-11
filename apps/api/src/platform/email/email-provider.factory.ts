import type { EmailProvider } from './email-provider.port';
import { EmailFakeAdapter } from './adapters/email-fake.adapter';
import { ResendAdapter } from './adapters/resend.adapter';

/**
 * Selección del `EmailProvider` (ADR-006): `EMAIL_PROVIDER=resend` + `EMAIL_API_KEY` usa Resend
 * real; cualquier otro caso (o sin key) usa el fake — así dev/tests no mandan mails de verdad.
 */
export function crearEmailProvider(env: NodeJS.ProcessEnv = process.env): EmailProvider {
  if (env.EMAIL_PROVIDER === 'resend' && env.EMAIL_API_KEY) {
    return new ResendAdapter(env.EMAIL_API_KEY, env.EMAIL_FROM ?? 'onboarding@resend.dev');
  }
  return new EmailFakeAdapter();
}
