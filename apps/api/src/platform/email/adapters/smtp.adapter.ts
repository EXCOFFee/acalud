import nodemailer, { type Transporter } from 'nodemailer';
import type { EmailAEnviar, EmailProvider, ResultadoEnvio } from '../email-provider.port';

export interface OpcionesSmtp {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly pass: string;
}

/**
 * Adapter real de EmailProvider vía SMTP (ADR-006), pensado para Gmail con App Password:
 * gratis y entrega a cualquier casilla sin dominio propio (Google firma SPF/DKIM). Un fallo
 * de envío lanza error → el worker del outbox reintenta (CU-E05 / PG-03).
 */
export class SmtpAdapter implements EmailProvider {
  private readonly transporter: Transporter;

  constructor(
    private readonly from: string,
    opciones: OpcionesSmtp,
  ) {
    this.transporter = nodemailer.createTransport({
      host: opciones.host,
      port: opciones.port,
      secure: opciones.port === 465, // 465 = TLS implícito; 587 = STARTTLS
      auth: { user: opciones.user, pass: opciones.pass },
    });
  }

  async enviar(email: EmailAEnviar): Promise<ResultadoEnvio> {
    await this.transporter.sendMail({
      from: this.from,
      to: email.destinatario,
      subject: email.asunto,
      html: email.cuerpo,
    });
    return { email_id: email.email_id, enviado: true, proveedor: 'smtp' };
  }
}
