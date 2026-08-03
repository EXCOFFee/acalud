import type { Pool } from 'pg';
import type {
  ReposComunidadAdmin,
  UnidadDeTrabajoComunidadAdmin,
} from '../../domain/ports/comunidad-admin.uow';
import { AuditoriaComunidadPg } from './auditoria-comunidad.repository.pg';
import { EncuestasAdminRepositoryPg } from './encuestas-admin.repository.pg';

/** Unit of Work del ABM de comunidad (CU-20): propia del módulo (ADR-002). */
export class UnidadDeTrabajoComunidadAdminPg implements UnidadDeTrabajoComunidadAdmin {
  constructor(private readonly pool: Pool) {}

  async transaccion<T>(fn: (repos: ReposComunidadAdmin) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const resultado = await fn({
        encuestas: new EncuestasAdminRepositoryPg(client),
        auditoria: new AuditoriaComunidadPg(client),
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
