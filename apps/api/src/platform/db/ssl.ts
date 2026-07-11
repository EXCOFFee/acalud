import type { PoolConfig } from 'pg';

/**
 * Configuración SSL para PostgreSQL según el host de la connection string:
 * - Supabase (y cualquier host remoto) exige SSL.
 * - localhost / Testcontainers no usan SSL.
 * `rejectUnauthorized: false` acepta el certificado del pooler de Supabase sin CA local
 * (aceptable para este alcance; el transporte igual va cifrado).
 */
export function sslDesde(connectionString: string | undefined): PoolConfig['ssl'] {
  if (connectionString === undefined) return false;
  try {
    const host = new URL(connectionString).hostname;
    const esLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    return esLocal ? false : { rejectUnauthorized: false };
  } catch {
    return false;
  }
}
