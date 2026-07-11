import type { EmailAEnviar, EmailProvider, ResultadoEnvio } from '../email-provider.port';

/**
 * Adapter real de EmailProvider vía la API HTTP de Resend (ADR-006). Sin SDK: un POST con
 * `fetch`. Un fallo (4xx/5xx) lanza error → el worker del outbox reintenta (CU-E05 / PG-03).
 */
export class ResendAdapter implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async enviar(email: EmailAEnviar): Promise<ResultadoEnvio> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: email.destinatario,
        subject: email.asunto,
        html: email.cuerpo,
      }),
    });
    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      throw new Error(`Resend ${res.status}: ${detalle.slice(0, 200)}`);
    }
    return { email_id: email.email_id, enviado: true, proveedor: 'resend' };
  }
}
