import type { PoolClient } from 'pg';
import type { AuditoriaComunidad } from '../../domain/ports/comunidad-admin.uow';

/** Auditoría del BC Comunidad sobre `audit_log` (RN-007/RNF-002, CU-20). */
export class AuditoriaComunidadPg implements AuditoriaComunidad {
  constructor(private readonly client: PoolClient) {}

  async registrar(evento: {
    tipo: 'create' | 'update' | 'activate' | 'deactivate' | 'delete';
    sujetoTipo: 'poll';
    sujetoId: string;
    actorId: string;
    datos?: Record<string, unknown>;
  }): Promise<void> {
    await this.client.query(
      `INSERT INTO audit_log (action, entity_type, entity_id, actor_user_id, new_values)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [evento.tipo, evento.sujetoTipo, evento.sujetoId, evento.actorId, JSON.stringify(evento.datos ?? {})],
    );
  }
}
