import type { Pool, PoolClient } from 'pg';
import type { IntentosLoginRepository } from '../../domain/ports/cuenta.repository';
import type { ResultadoIntento } from '../../domain/politica-bloqueo';

type Ejecutor = Pool | PoolClient;

/**
 * Registro de intentos de ingreso (`login_attempts`). Sostiene el bloqueo de CU-02 RN-007 y
 * deja el rastro auditable de cada intento (dirección y momento).
 */
export class IntentosLoginRepositoryPg implements IntentosLoginRepository {
  constructor(private readonly db: Ejecutor) {}

  async registrar(email: string, ip: string | null, resultado: ResultadoIntento): Promise<void> {
    await this.db.query(
      `INSERT INTO login_attempts (email, ip_address, result) VALUES ($1, $2, $3)`,
      [email, ip ?? 'unknown', resultado],
    );
  }

  async contarFallosDesde(email: string, desde: Date): Promise<number> {
    const r = await this.db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM login_attempts
        WHERE lower(email) = lower($1) AND result = 'failed' AND attempted_at >= $2`,
      [email, desde],
    );
    return r.rows[0]?.n ?? 0;
  }
}
