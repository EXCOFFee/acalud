import type { PoolClient } from 'pg';
import { renderizar } from '../../../../platform/outbox/plantillas';
import type { NotificacionesComunidad, OutboxComunidad } from '../../domain/ports/propuestas.uow';

export class NotificacionesComunidadPg implements NotificacionesComunidad {
  constructor(private readonly client: PoolClient) {}

  async crear(notificacion: {
    destinatarioId: string;
    tipo: string;
    titulo: string;
    mensaje: string;
    entidadTipo: string;
    entidadId: string;
  }): Promise<void> {
    await this.client.query(
      `INSERT INTO notifications
         (recipient_user_id, type, title, message, related_entity_type, related_entity_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        notificacion.destinatarioId,
        notificacion.tipo,
        notificacion.titulo,
        notificacion.mensaje,
        notificacion.entidadTipo,
        notificacion.entidadId,
      ],
    );
  }
}

export class OutboxComunidadPg implements OutboxComunidad {
  constructor(private readonly client: PoolClient) {}

  async encolar(email: { tipo: string; destinatario: string; payload: Record<string, unknown> }): Promise<void> {
    const plantilla = renderizar(email.tipo, email.payload);
    if (plantilla === null) throw new Error(`tipo de email sin plantilla: ${email.tipo}`);

    await this.client.query(
      `INSERT INTO outbox_emails (template, recipient, subject, body)
       VALUES ($1, $2, $3, $4)`,
      [email.tipo, email.destinatario, plantilla.asunto, plantilla.html],
    );
  }
}
