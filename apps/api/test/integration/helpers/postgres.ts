import { resolve } from 'node:path';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Client, type QueryResult, type QueryResultRow } from 'pg';
import { aplicarMigraciones } from '../../../src/platform/db/migrator';

// El comando `test:integration` corre con cwd = apps/api; infra/migrations está dos niveles arriba.
const MIGRACIONES_DIR = resolve(process.cwd(), '../../infra/migrations');

export interface CtxPostgres {
  container: StartedPostgreSqlContainer;
  client: Client;
  detener: () => Promise<void>;
}

/**
 * Levanta un PostgreSQL REAL con Testcontainers y le aplica todas las migraciones.
 * Que la migración inicial se aplique sin error ya valida que "la BD levanta con todos
 * los constraints" (Gate 0). Requiere Docker (local o CI).
 */
export async function levantarPostgresConEsquema(): Promise<CtxPostgres> {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const client = new Client({ connectionString: container.getConnectionUri() });
  await client.connect();
  await aplicarMigraciones(client, MIGRACIONES_DIR);

  const detener = async (): Promise<void> => {
    await client.end();
    await container.stop();
  };
  return { container, client, detener };
}

/** Devuelve la primera fila o lanza — respeta noUncheckedIndexedAccess. */
export function primeraFila<T extends QueryResultRow>(resultado: QueryResult<T>): T {
  const fila = resultado.rows[0];
  if (fila === undefined) throw new Error('la consulta no devolvió filas');
  return fila;
}
