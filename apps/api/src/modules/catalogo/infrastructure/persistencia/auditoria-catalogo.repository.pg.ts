import type { PoolClient } from 'pg';
import type { AuditoriaCatalogo } from '../../domain/ports/catalogo-admin.uow';

/** Auditoría del BC Catálogo sobre `audit_log` (RN-002/RNF-002, CU-19). Cada BC tiene la suya (ADR-002). */
export class AuditoriaCatalogoPg implements AuditoriaCatalogo {
  constructor(private readonly client: PoolClient) {}

  async registrar(evento: {
    tipo: 'create' | 'update' | 'delete';
    sujetoTipo: 'product' | 'category' | 'demo';
    sujetoId: string;
    actorId: string;
    datos?: Record<string, unknown>;
  }): Promise<void> {
    await this.client.query(
      `INSERT INTO audit_log (action, entity_type, entity_id, actor_user_id, new_values)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        evento.tipo,
        evento.sujetoTipo,
        evento.sujetoId,
        evento.actorId,
        JSON.stringify(evento.datos ?? {}),
      ],
    );
  }
}
