import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Client } from 'pg';

/**
 * Aplica las migraciones SQL versionadas de `infra/migrations/` contra una BD real,
 * en orden alfabético (0001_, 0002_, …), cada una en su propia transacción y una sola
 * vez (registro en `schema_migrations`). Es el mecanismo de "SQL a mano" de 5.1/5.3:
 * nunca se edita una migración ya aplicada, se agrega una nueva.
 *
 * Se usa desde el harness de integración (Testcontainers) y, en el deploy (Etapa 1),
 * desde el script de infraestructura contra la connection string directa de Supabase.
 */
export async function aplicarMigraciones(
  client: Client,
  migracionesDir: string,
): Promise<string[]> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     text PRIMARY KEY,
      aplicada_en timestamptz NOT NULL DEFAULT now()
    );
  `);

  const archivos = (await readdir(migracionesDir))
    .filter((nombre) => nombre.endsWith('.sql'))
    .sort();

  const aplicadas: string[] = [];
  for (const archivo of archivos) {
    const yaAplicada = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [
      archivo,
    ]);
    if (yaAplicada.rows.length > 0) continue;

    const sql = await readFile(join(migracionesDir, archivo), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [archivo]);
      await client.query('COMMIT');
      aplicadas.push(archivo);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Migración ${archivo} falló: ${(error as Error).message}`, { cause: error });
    }
  }
  return aplicadas;
}
