import type { Pool, PoolClient } from 'pg';
import type { AuditoriaPort, EventoAuditoria } from '../../domain/ports/unidad-de-trabajo';

type Ejecutor = Pool | PoolClient;

/** Inserta en la tabla de auditoría append-only (NFR-S6): solo INSERT, nunca UPDATE/DELETE. */
export class AuditoriaRepositoryPg implements AuditoriaPort {
  constructor(private readonly db: Ejecutor) {}

  async registrar(evento: EventoAuditoria): Promise<void> {
    await this.db.query(
      `INSERT INTO eventos_auditoria (tipo, sujeto_tipo, sujeto_id, actor_id, datos, ip)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        evento.tipo,
        evento.sujetoTipo,
        evento.sujetoId,
        evento.actorId ?? null,
        JSON.stringify(evento.datos ?? {}),
        evento.ip ?? null,
      ],
    );
  }
}
