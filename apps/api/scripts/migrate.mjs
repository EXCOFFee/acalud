// Runner de migraciones para deploy (5.1/5.3): aplica infra/migrations/*.sql en orden,
// una sola vez, cada una en su transacción, contra DIRECT_URL (o DATABASE_URL).
// Uso local:  node --env-file=.env apps/api/scripts/migrate.mjs
// En Render:  las env vars ya están; `node scripts/migrate.mjs` como paso previo al deploy.
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRACIONES_DIR = resolve(__dirname, '../../../infra/migrations');

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DIRECT_URL o DATABASE_URL');
  process.exit(1);
}

function ssl(connectionString) {
  try {
    const host = new URL(connectionString).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1'
      ? false
      : { rejectUnauthorized: false };
  } catch {
    return false;
  }
}

const client = new pg.Client({ connectionString: url, ssl: ssl(url) });
await client.connect();
await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version     text PRIMARY KEY,
    aplicada_en timestamptz NOT NULL DEFAULT now()
  );
`);

const archivos = (await readdir(MIGRACIONES_DIR)).filter((f) => f.endsWith('.sql')).sort();
let aplicadas = 0;
for (const archivo of archivos) {
  const ya = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [archivo]);
  if (ya.rows.length > 0) {
    console.log(`=  ${archivo} (ya aplicada)`);
    continue;
  }
  const sql = await readFile(join(MIGRACIONES_DIR, archivo), 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [archivo]);
    await client.query('COMMIT');
    console.log(`✔  ${archivo} aplicada`);
    aplicadas++;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`✘  ${archivo} falló:`, error.message);
    await client.end();
    process.exit(1);
  }
}
await client.end();
console.log(`Migraciones al día (${aplicadas} nueva(s)).`);
