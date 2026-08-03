import type { Pool } from 'pg';
import type {
  ReposCatalogoAdmin,
  UnidadDeTrabajoCatalogoAdmin,
} from '../../domain/ports/catalogo-admin.uow';
import { AuditoriaCatalogoPg } from './auditoria-catalogo.repository.pg';
import { CategoriasAdminRepositoryPg } from './categorias-admin.repository.pg';
import { DemosAdminRepositoryPg } from './demos-admin.repository.pg';
import { ProductosAdminRepositoryPg } from './productos-admin.repository.pg';

/** Unit of Work del ABM de catálogo (CU-19): propia del módulo, no comparte transacción con nada de fuera (ADR-002). */
export class UnidadDeTrabajoCatalogoAdminPg implements UnidadDeTrabajoCatalogoAdmin {
  constructor(private readonly pool: Pool) {}

  async transaccion<T>(fn: (repos: ReposCatalogoAdmin) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const resultado = await fn({
        productos: new ProductosAdminRepositoryPg(client),
        categorias: new CategoriasAdminRepositoryPg(client),
        demos: new DemosAdminRepositoryPg(client),
        auditoria: new AuditoriaCatalogoPg(client),
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
