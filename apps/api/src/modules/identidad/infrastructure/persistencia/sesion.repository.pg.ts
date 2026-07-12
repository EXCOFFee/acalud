import type { Pool, PoolClient } from 'pg';
import type { EstadoCuenta } from '../../domain/cuenta';
import type {
  DatosNuevaSesion,
  SesionConCuenta,
  SesionRepository,
} from '../../domain/ports/sesion.repository';

type Ejecutor = Pool | PoolClient;

interface FilaSesionCuenta {
  sesion_id: string;
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  estado: EstadoCuenta;
  es_admin: boolean;
}

export class SesionRepositoryPg implements SesionRepository {
  constructor(private readonly db: Ejecutor) {}

  async crear(datos: DatosNuevaSesion): Promise<void> {
    await this.db.query(
      `INSERT INTO sesiones (cuenta_id, token_hash, ip, user_agent, expira_en)
       VALUES ($1, $2, $3, $4, $5)`,
      [datos.cuentaId, datos.tokenHash, datos.ip, datos.userAgent, datos.expiraEn],
    );
  }

  async buscarActivaPorTokenHash(tokenHash: string, ahora: Date): Promise<SesionConCuenta | null> {
    const r = await this.db.query<FilaSesionCuenta>(
      `SELECT s.id AS sesion_id, c.id, c.email, c.nombre, c.apellido, c.estado, c.es_admin
         FROM sesiones s
         JOIN cuentas c ON c.id = s.cuenta_id
        WHERE s.token_hash = $1 AND s.revocada_en IS NULL AND s.expira_en > $2`,
      [tokenHash, ahora],
    );
    const fila = r.rows[0];
    if (!fila) return null;
    return {
      sesionId: fila.sesion_id,
      perfil: {
        id: fila.id,
        email: fila.email,
        nombre: fila.nombre,
        apellido: fila.apellido,
        estado: fila.estado,
        es_admin: fila.es_admin,
      },
      capacidadesLimitadas: fila.estado === 'no_verificada',
    };
  }

  async revocarPorTokenHash(tokenHash: string, ahora: Date): Promise<void> {
    await this.db.query(
      `UPDATE sesiones SET revocada_en = $2 WHERE token_hash = $1 AND revocada_en IS NULL`,
      [tokenHash, ahora],
    );
  }

  async revocarTodasDeCuenta(cuentaId: string, ahora: Date): Promise<void> {
    await this.db.query(
      `UPDATE sesiones SET revocada_en = $2 WHERE cuenta_id = $1 AND revocada_en IS NULL`,
      [cuentaId, ahora],
    );
  }

  async renovar(sesionId: string, expiraEn: Date): Promise<void> {
    await this.db.query(`UPDATE sesiones SET expira_en = $2 WHERE id = $1`, [sesionId, expiraEn]);
  }
}
