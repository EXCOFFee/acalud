import type { EmailProvider } from './email-provider.port';
import { EmailFakeAdapter } from './adapters/email-fake.adapter';
import { ResendAdapter } from './adapters/resend.adapter';
import { SmtpAdapter } from './adapters/smtp.adapter';

/**
 * Selección del `EmailProvider` (ADR-006) por variables de entorno:
 * - `EMAIL_PROVIDER=gmail|smtp` + `EMAIL_SMTP_USER`/`EMAIL_SMTP_PASS` → SMTP real (Gmail con
 *   App Password: gratis y entrega a cualquier casilla sin dominio propio).
 * - `EMAIL_PROVIDER=resend` + `EMAIL_API_KEY` → Resend (HTTP; sin dominio solo entrega al dueño).
 * - Cualquier otro caso (o faltan credenciales) → fake, así dev/tests no mandan mails de verdad.
 */
export function crearEmailProvider(env: NodeJS.ProcessEnv = process.env): EmailProvider {
  if (
    (env.EMAIL_PROVIDER === 'gmail' || env.EMAIL_PROVIDER === 'smtp') &&
    env.EMAIL_SMTP_USER &&
    env.EMAIL_SMTP_PASS
  ) {
    return new SmtpAdapter(env.EMAIL_FROM ?? env.EMAIL_SMTP_USER, {
      host: env.EMAIL_SMTP_HOST ?? 'smtp.gmail.com',
      port: Number(env.EMAIL_SMTP_PORT ?? 465),
      user: env.EMAIL_SMTP_USER,
      pass: env.EMAIL_SMTP_PASS,
    });
  }
  if (env.EMAIL_PROVIDER === 'resend' && env.EMAIL_API_KEY) {
    return new ResendAdapter(env.EMAIL_API_KEY, env.EMAIL_FROM ?? 'onboarding@resend.dev');
  }
  return new EmailFakeAdapter();
}
