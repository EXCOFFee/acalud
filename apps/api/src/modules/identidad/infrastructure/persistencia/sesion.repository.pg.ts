import type { Pool, PoolClient } from 'pg';
import type {
  DatosNuevaSesion,
  SesionConCuenta,
  SesionRepository,
} from '../../domain/ports/sesion.repository';

type Ejecutor = Pool | PoolClient;

interface FilaSesionUsuario {
  sesion_id: string;
  id: string;
  email: string;
  full_name: string;
  email_verified: boolean;
  role: 'docente' | 'admin';
}

/** Ver la nota de `cuenta.repository.pg`: partición temporal de `full_name`. */
function partirNombre(fullName: string): { nombre: string; apellido: string } {
  const corte = fullName.indexOf(' ');
  return corte === -1
    ? { nombre: fullName, apellido: '' }
    : { nombre: fullName.slice(0, corte), apellido: fullName.slice(corte + 1) };
}

export class SesionRepositoryPg implements SesionRepository {
  constructor(private readonly db: Ejecutor) {}

  async crear(datos: DatosNuevaSesion): Promise<void> {
    await this.db.query(
      `INSERT INTO sessions (user_id, token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [datos.cuentaId, datos.tokenHash, datos.ip, datos.userAgent, datos.expiraEn],
    );
  }

  async buscarActivaPorTokenHash(tokenHash: string, ahora: Date): Promise<SesionConCuenta | null> {
    const r = await this.db.query<FilaSesionUsuario>(
      `SELECT s.id AS sesion_id, u.id, u.email, u.full_name, u.email_verified, u.role
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = $1 AND s.expires_at > $2`,
      [tokenHash, ahora],
    );
    const fila = r.rows[0];
    if (!fila) return null;
    const { nombre, apellido } = partirNombre(fila.full_name);
    return {
      sesionId: fila.sesion_id,
      perfil: {
        id: fila.id,
        email: fila.email,
        nombre,
        apellido,
        estado: fila.email_verified ? 'verificada' : 'no_verificada',
        es_admin: fila.role === 'admin',
      },
      capacidadesLimitadas: !fila.email_verified,
    };
  }

  /**
   * El cierre de sesión ELIMINA el registro (addendum §4): la credencial deja de existir, sin
   * ventana residual ni dependencia de una lista de revocación. Idempotente.
   */
  async revocarPorTokenHash(tokenHash: string, _ahora: Date): Promise<void> {
    await this.db.query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash]);
  }

  async revocarTodasDeCuenta(cuentaId: string, _ahora: Date): Promise<void> {
    await this.db.query(`DELETE FROM sessions WHERE user_id = $1`, [cuentaId]);
  }

  async renovar(sesionId: string, expiraEn: Date): Promise<void> {
    await this.db.query(`UPDATE sessions SET expires_at = $2, last_seen_at = now() WHERE id = $1`, [
      sesionId,
      expiraEn,
    ]);
  }
}
