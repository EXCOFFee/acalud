import type { EmailAEnviar, EmailProvider, ResultadoEnvio } from '../email-provider.port';

/**
 * Adapter FAKE de EmailProvider (ADR-006). Registra el "envío" en memoria (útil para asserts
 * de tests del worker de outbox) y confirma. El adapter real (Resend/Brevo) llega en la Etapa 2/3.
 */
export class EmailFakeAdapter implements EmailProvider {
  readonly enviados: EmailAEnviar[] = [];

  async enviar(email: EmailAEnviar): Promise<ResultadoEnvio> {
    this.enviados.push(email);
    return { email_id: email.email_id, enviado: true, proveedor: 'fake' };
  }
}
