import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { EmailEncolado, OutboxPort } from '../../domain/ports/unidad-de-trabajo';

type Ejecutor = Pool | PoolClient;

/** Escribe el email en el outbox (patrón outbox, CU-E05) en la misma tx que la operación. */
export class OutboxRepositoryPg implements OutboxPort {
  constructor(private readonly db: Ejecutor) {}

  async encolar(email: EmailEncolado): Promise<void> {
    await this.db.query(
      `INSERT INTO outbox_emails (email_id, tipo, destinatario, payload)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [randomUUID(), email.tipo, email.destinatario, JSON.stringify(email.payload)],
    );
  }
}
