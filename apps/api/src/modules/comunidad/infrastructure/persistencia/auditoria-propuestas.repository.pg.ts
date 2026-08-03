import type { PoolClient } from 'pg';
import type { AuditoriaComunidadEventos } from '../../domain/ports/propuestas.uow';

/** Auditoría de propuestas sobre `audit_log` (RNF-002, CU-15/CU-21). */
export class AuditoriaPropuestasPg implements AuditoriaComunidadEventos {
  constructor(private readonly client: PoolClient) {}

  async registrar(evento: {
    tipo: string;
    sujetoTipo: 'proposal';
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
