import type { Pool } from 'pg';
import type { ReposTransaccionales, UnidadDeTrabajo } from '../../domain/ports/unidad-de-trabajo';
import { AuditoriaRepositoryPg } from './auditoria.repository.pg';
import { CuentaRepositoryPg } from './cuenta.repository.pg';
import { OutboxRepositoryPg } from './outbox.repository.pg';
import { SesionRepositoryPg } from './sesion.repository.pg';
import { TokenRepositoryPg } from './token.repository.pg';

/**
 * Unit of Work sobre PostgreSQL: abre un cliente, `BEGIN`, provee los repos ligados a esa
 * transacción y hace commit total o rollback total (ADR-002).
 */
export class UnidadDeTrabajoPg implements UnidadDeTrabajo {
  constructor(private readonly pool: Pool) {}

  async transaccion<T>(fn: (repos: ReposTransaccionales) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const repos: ReposTransaccionales = {
        cuentas: new CuentaRepositoryPg(client),
        sesiones: new SesionRepositoryPg(client),
        tokens: new TokenRepositoryPg(client),
        outbox: new OutboxRepositoryPg(client),
        auditoria: new AuditoriaRepositoryPg(client),
      };
      const resultado = await fn(repos);
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
