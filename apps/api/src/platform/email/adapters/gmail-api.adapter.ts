import type { EmailAEnviar, EmailProvider, ResultadoEnvio } from '../email-provider.port';

export interface OAuthGmail {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
}

/**
 * Adapter real de EmailProvider vía la API HTTP de Gmail (ADR-006). OAuth2 con refresh token:
 * envía desde la propia casilla del usuario por HTTPS (no SMTP), así funciona desde Render, que
 * bloquea el SMTP saliente. Entrega a cualquier destinatario, gratis. Un fallo lanza error → el
 * worker del outbox reintenta (CU-E05 / PG-03).
 */
export class GmailApiAdapter implements EmailProvider {
  private accessToken: string | null = null;
  private expiraEnMs = 0;

  constructor(
    private readonly from: string,
    private readonly oauth: OAuthGmail,
  ) {}

  /** Access token cacheado; se renueva con el refresh token 60 s antes de vencer. */
  private async token(): Promise<string> {
    const ahora = Date.now();
    if (this.accessToken !== null && ahora < this.expiraEnMs - 60_000) return this.accessToken;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.oauth.clientId,
        client_secret: this.oauth.clientSecret,
        refresh_token: this.oauth.refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      throw new Error(`Gmail OAuth ${res.status}: ${detalle.slice(0, 200)}`);
    }
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.expiraEnMs = ahora + data.expires_in * 1000;
    return this.accessToken;
  }

  async enviar(email: EmailAEnviar): Promise<ResultadoEnvio> {
    const token = await this.token();

    const asunto = `=?UTF-8?B?${Buffer.from(email.asunto, 'utf8').toString('base64')}?=`;
    const mime =
      `From: ${this.from}\r\n` +
      `To: ${email.destinatario}\r\n` +
      `Subject: ${asunto}\r\n` +
      `MIME-Version: 1.0\r\n` +
      `Content-Type: text/html; charset=UTF-8\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      Buffer.from(email.cuerpo, 'utf8').toString('base64');

    const raw = Buffer.from(mime, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, ''); // base64url sin padding, como pide la API de Gmail

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
    });
    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      throw new Error(`Gmail send ${res.status}: ${detalle.slice(0, 200)}`);
    }
    return { email_id: email.email_id, enviado: true, proveedor: 'gmail-api' };
  }
}
