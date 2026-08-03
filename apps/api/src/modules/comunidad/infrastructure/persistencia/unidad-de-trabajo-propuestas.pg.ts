import type { Pool } from 'pg';
import type { ReposPropuestas, UnidadDeTrabajoPropuestas } from '../../domain/ports/propuestas.uow';
import { AuditoriaPropuestasPg } from './auditoria-propuestas.repository.pg';
import { NotificacionesComunidadPg, OutboxComunidadPg } from './notificaciones-propuestas.repository.pg';
import { PropuestasRepositoryPg } from './propuestas.repository.pg';

/** Unit of Work de propuestas (CU-15/CU-21): propia del subdominio (ADR-002). */
export class UnidadDeTrabajoPropuestasPg implements UnidadDeTrabajoPropuestas {
  constructor(private readonly pool: Pool) {}

  async transaccion<T>(fn: (repos: ReposPropuestas) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const resultado = await fn({
        propuestas: new PropuestasRepositoryPg(client),
        notificaciones: new NotificacionesComunidadPg(client),
        outbox: new OutboxComunidadPg(client),
        auditoria: new AuditoriaPropuestasPg(client),
      });
      await client.query('COMMIT');
      return resultado;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
