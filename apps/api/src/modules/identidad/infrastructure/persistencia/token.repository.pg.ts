import type { Pool, PoolClient } from 'pg';
import type {
  TipoTokenDeUso,
  TokenDeUsoNuevo,
  TokenRepository,
  TokenVigente,
} from '../../domain/ports/unidad-de-trabajo';

type Ejecutor = Pool | PoolClient;

/** El dominio todavía nombra los propósitos en español; el esquema usa `token_purpose`. */
const PROPOSITO: Record<TipoTokenDeUso, string> = {
  verificacion_email: 'email_verification',
  recuperacion_password: 'password_reset',
  cambio_email: 'email_change',
};

/**
 * Testigos de un solo uso (`user_tokens`, addendum II §1): verificación de correo,
 * recuperación de contraseña y cambio de correo comparten mecánica y se distinguen por
 * `purpose`. El testigo se persiste hasheado, nunca en claro.
 */
export class TokenRepositoryPg implements TokenRepository {
  constructor(private readonly db: Ejecutor) {}

  async crear(token: TokenDeUsoNuevo): Promise<void> {
    await this.db.query(
      `INSERT INTO user_tokens (user_id, purpose, token_hash, payload, expires_at)
       VALUES ($1, $2::token_purpose, $3, $4, $5)`,
      [
        token.cuentaId,
        PROPOSITO[token.tipo],
        token.tokenHash,
        token.emailNuevo ?? null,
        token.expiraEn,
      ],
    );
  }

  async buscarVigentePorHash(
    tokenHash: string,
    tipo: TipoTokenDeUso,
    ahora: Date,
  ): Promise<TokenVigente | null> {
    const r = await this.db.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM user_tokens
        WHERE token_hash = $1 AND purpose = $2::token_purpose
          AND used_at IS NULL AND expires_at > $3`,
      [tokenHash, PROPOSITO[tipo], ahora],
    );
    const fila = r.rows[0];
    return fila ? { id: fila.id, cuentaId: fila.user_id } : null;
  }

  async marcarUsado(id: string): Promise<void> {
    await this.db.query(`UPDATE user_tokens SET used_at = now() WHERE id = $1`, [id]);
  }

  /**
   * Al emitir un testigo nuevo, el anterior del mismo propósito queda invalidado: el índice
   * único parcial `uq_user_tokens_active` admite a lo sumo uno vigente por usuario y propósito.
   */
  async invalidarVigentesPorCuenta(cuentaId: string, tipo: TipoTokenDeUso): Promise<void> {
    await this.db.query(
      `UPDATE user_tokens SET used_at = now()
        WHERE user_id = $1 AND purpose = $2::token_purpose AND used_at IS NULL`,
      [cuentaId, PROPOSITO[tipo]],
    );
  }
}
