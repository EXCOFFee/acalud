import type { Pool, PoolClient } from 'pg';
import { renderizar } from '../../../../platform/outbox/plantillas';
import type { EmailEncolado, OutboxPort } from '../../domain/ports/unidad-de-trabajo';

type Ejecutor = Pool | PoolClient;

/**
 * Escribe el email en el outbox (patrón outbox, CU-E05) en la misma tx que la operación.
 *
 * El mensaje se guarda YA RENDERIZADO (asunto + cuerpo). Así la fila del outbox es completa e
 * inmutable desde que se escribe, y el envío no puede fallar más tarde por un error de
 * plantilla: si el tipo no tiene plantilla, revienta acá, dentro de la transacción, en vez de
 * dejar un correo trabado en la cola.
 */
export class OutboxRepositoryPg implements OutboxPort {
  constructor(private readonly db: Ejecutor) {}

  async encolar(email: EmailEncolado): Promise<void> {
    const plantilla = renderizar(email.tipo, email.payload);
    if (plantilla === null) throw new Error(`tipo de email sin plantilla: ${email.tipo}`);

    await this.db.query(
      `INSERT INTO outbox_emails (template, recipient, subject, body)
       VALUES ($1, $2, $3, $4)`,
      [email.tipo, email.destinatario, plantilla.asunto, plantilla.html],
    );
  }
}
