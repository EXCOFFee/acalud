import type { Pool, PoolClient } from 'pg';
import type {
  TipoTokenDeUso,
  TokenDeUsoNuevo,
  TokenRepository,
  TokenVigente,
} from '../../domain/ports/unidad-de-trabajo';

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

  async buscarVigentePorHash(
    tokenHash: string,
    tipo: TipoTokenDeUso,
    ahora: Date,
  ): Promise<TokenVigente | null> {
    const r = await this.db.query<{ id: string; cuenta_id: string }>(
      `SELECT id, cuenta_id FROM tokens_de_uso
        WHERE token_hash = $1 AND tipo = $2 AND usado = false AND expira_en > $3`,
      [tokenHash, tipo, ahora],
    );
    const fila = r.rows[0];
    return fila ? { id: fila.id, cuentaId: fila.cuenta_id } : null;
  }

  async marcarUsado(id: string): Promise<void> {
    await this.db.query(`UPDATE tokens_de_uso SET usado = true WHERE id = $1`, [id]);
  }

  async invalidarVigentesPorCuenta(cuentaId: string, tipo: TipoTokenDeUso): Promise<void> {
    await this.db.query(
      `UPDATE tokens_de_uso SET usado = true
        WHERE cuenta_id = $1 AND tipo = $2 AND usado = false`,
      [cuentaId, tipo],
    );
  }
}
