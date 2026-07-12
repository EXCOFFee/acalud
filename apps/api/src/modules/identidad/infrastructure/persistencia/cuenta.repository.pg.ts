import type { Pool, PoolClient } from 'pg';
import { Cuenta, type EstadoCuenta, type EstadoSeguridad } from '../../domain/cuenta';
import type { CuentaRepository, DatosNuevaCuenta } from '../../domain/ports/cuenta.repository';

type Ejecutor = Pool | PoolClient;

interface FilaCuenta {
  id: string;
  email: string;
  hash_password: string;
  nombre: string;
  apellido: string;
  estado: EstadoCuenta;
  es_admin: boolean;
  intentos_fallidos: number;
  intentos_desde: Date | null;
  bloqueada_hasta: Date | null;
}

const COLUMNAS = `id, email, hash_password, nombre, apellido, estado, es_admin,
                  intentos_fallidos, intentos_desde, bloqueada_hasta`;

function aCuenta(fila: FilaCuenta): Cuenta {
  return new Cuenta({
    id: fila.id,
    email: fila.email,
    hashPassword: fila.hash_password,
    nombre: fila.nombre,
    apellido: fila.apellido,
    estado: fila.estado,
    esAdmin: fila.es_admin,
    intentosFallidos: fila.intentos_fallidos,
    intentosDesde: fila.intentos_desde,
    bloqueadaHasta: fila.bloqueada_hasta,
  });
}

export class CuentaRepositoryPg implements CuentaRepository {
  constructor(private readonly db: Ejecutor) {}

  async buscarPorEmail(email: string): Promise<Cuenta | null> {
    const r = await this.db.query<FilaCuenta>(
      `SELECT ${COLUMNAS} FROM cuentas WHERE lower(email) = lower($1)`,
      [email],
    );
    const fila = r.rows[0];
    return fila ? aCuenta(fila) : null;
  }

  async buscarPorId(id: string): Promise<Cuenta | null> {
    const r = await this.db.query<FilaCuenta>(`SELECT ${COLUMNAS} FROM cuentas WHERE id = $1`, [id]);
    const fila = r.rows[0];
    return fila ? aCuenta(fila) : null;
  }

  async crear(datos: DatosNuevaCuenta): Promise<Cuenta> {
    const r = await this.db.query<FilaCuenta>(
      `INSERT INTO cuentas (email, hash_password, nombre, apellido)
       VALUES ($1, $2, $3, $4)
       RETURNING ${COLUMNAS}`,
      [datos.email, datos.hashPassword, datos.nombre, datos.apellido],
    );
    const fila = r.rows[0];
    if (!fila) throw new Error('el INSERT de cuenta no devolvió fila');
    return aCuenta(fila);
  }

  async actualizarSeguridad(id: string, s: EstadoSeguridad): Promise<void> {
    await this.db.query(
      `UPDATE cuentas
         SET intentos_fallidos = $2,
             intentos_desde    = $3,
             bloqueada_hasta   = $4,
             ultimo_login      = COALESCE($5, ultimo_login)
       WHERE id = $1`,
      [id, s.intentosFallidos, s.intentosDesde, s.bloqueadaHasta, s.ultimoLogin],
    );
  }

  async verificar(id: string): Promise<void> {
    await this.db.query(`UPDATE cuentas SET estado = 'verificada' WHERE id = $1`, [id]);
  }

  async actualizarContrasena(id: string, hashPassword: string): Promise<void> {
    await this.db.query(`UPDATE cuentas SET hash_password = $2 WHERE id = $1`, [id, hashPassword]);
  }
}
