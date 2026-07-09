/**
 * Puerto `EmailProvider` (ADR-006). Lo consume únicamente el worker del outbox (CU-E05);
 * ningún caso de uso de negocio habla directo con el proveedor. Adapter fijo (Resend o Brevo,
 * a decidir en 5.1). Vive en `platform/` por ser soporte transversal (2.3).
 */
export interface EmailAEnviar {
  readonly email_id: string;
  readonly destinatario: string;
  readonly asunto: string;
  readonly cuerpo: string;
}

export interface ResultadoEnvio {
  readonly email_id: string;
  readonly enviado: boolean;
  readonly proveedor: string;
}

export interface EmailProvider {
  enviar(email: EmailAEnviar): Promise<ResultadoEnvio>;
}

export const EMAIL_PROVIDER = Symbol('EmailProvider');
