import type { Pool, PoolClient } from 'pg';
import type { TokenDeUsoNuevo, TokenRepository } from '../../domain/ports/unidad-de-trabajo';

type Ejecutor = Pool | PoolClient;

export class TokenRepositoryPg implements TokenRepository {
  constructor(private readonly db: Ejecutor) {}

  async crear(token: TokenDeUsoNuevo): Promise<void> {
    await this.db.query(
      `INSERT INTO tokens_de_uso (cuenta_id, tipo, token_hash, email_nuevo, expira_en)
       VALUES ($1, $2, $3, $4, $5)`,
      [token.cuentaId, token.tipo, token.tokenHash, token.emailNuevo ?? null, token.expiraEn],
    );
  }
}
