import type { Pool, PoolClient } from 'pg';
import { Cuenta } from '../../domain/cuenta';
import type {
  CuentaRepository,
  DatosNuevaCuenta,
  DatosPerfilCuenta,
  PerfilDocentePersistido,
} from '../../domain/ports/cuenta.repository';

type Ejecutor = Pool | PoolClient;

interface FilaUsuario {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  email_verified: boolean;
  role: 'docente' | 'admin';
}

const COLUMNAS = `id, email, password_hash, full_name, email_verified, role`;

/**
 * El esquema objetivo guarda un único `full_name`; el dominio todavía distingue nombre y
 * apellido. Se parte por el primer espacio como adaptación TEMPORAL: desaparece en la etapa
 * de dominio, cuando `User` adopte `fullName`. No hay pérdida de datos: el alta compone el
 * nombre completo a partir de los dos campos del formulario, y la lectura solo se usa para
 * mostrarlo.
 */
function aCuenta(fila: FilaUsuario): Cuenta {
  const corte = fila.full_name.indexOf(' ');
  const nombre = corte === -1 ? fila.full_name : fila.full_name.slice(0, corte);
  const apellido = corte === -1 ? '' : fila.full_name.slice(corte + 1);
  return new Cuenta({
    id: fila.id,
    email: fila.email,
    hashPassword: fila.password_hash,
    nombre,
    apellido,
    estado: fila.email_verified ? 'verificada' : 'no_verificada',
    esAdmin: fila.role === 'admin',
  });
}

export class CuentaRepositoryPg implements CuentaRepository {
  constructor(private readonly db: Ejecutor) {}

  async buscarPorEmail(email: string): Promise<Cuenta | null> {
    const r = await this.db.query<FilaUsuario>(
      `SELECT ${COLUMNAS} FROM users WHERE lower(email) = lower($1)`,
      [email],
    );
    const fila = r.rows[0];
    return fila ? aCuenta(fila) : null;
  }

  async buscarPorId(id: string): Promise<Cuenta | null> {
    const r = await this.db.query<FilaUsuario>(`SELECT ${COLUMNAS} FROM users WHERE id = $1`, [id]);
    const fila = r.rows[0];
    return fila ? aCuenta(fila) : null;
  }

  async crear(datos: DatosNuevaCuenta): Promise<Cuenta> {
    const r = await this.db.query<FilaUsuario>(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING ${COLUMNAS}`,
      [datos.email, datos.hashPassword, `${datos.nombre} ${datos.apellido}`.trim()],
    );
    const fila = r.rows[0];
    if (!fila) throw new Error('el INSERT de usuario no devolvió fila');
    return aCuenta(fila);
  }

  async verificar(id: string): Promise<void> {
    await this.db.query(`UPDATE users SET email_verified = true WHERE id = $1`, [id]);
  }

  async actualizarContrasena(id: string, hashPassword: string): Promise<void> {
    await this.db.query(`UPDATE users SET password_hash = $2 WHERE id = $1`, [id, hashPassword]);
  }

  async registrarUltimoLogin(id: string, ahora: Date): Promise<void> {
    await this.db.query(`UPDATE users SET last_login = $2 WHERE id = $1`, [id, ahora]);
  }

  async actualizarPerfil(id: string, datos: DatosPerfilCuenta): Promise<void> {
    const nombreCompleto = `${datos.nombre} ${datos.apellido}`.trim();
    await this.db.query(
      `WITH perfil AS (
         INSERT INTO teacher_profiles (user_id, level_id, subject_id, school_name)
         VALUES (
           $1,
           (SELECT id FROM levels WHERE lower(name) = lower($2) AND $2 IS NOT NULL),
           (SELECT id FROM subjects WHERE lower(name) = lower($3) AND $3 IS NOT NULL),
           NULLIF($4, '')
         )
         ON CONFLICT (user_id) DO UPDATE SET
           level_id = EXCLUDED.level_id,
           subject_id = EXCLUDED.subject_id,
           school_name = EXCLUDED.school_name
         RETURNING user_id
       )
       UPDATE users
       SET full_name = $5
       WHERE id = $1`,
      [
        id,
        datos.nivelEducativo ?? null,
        datos.materia ?? null,
        datos.institucion ?? null,
        nombreCompleto,
      ],
    );
  }

  async buscarPerfil(id: string): Promise<PerfilDocentePersistido | null> {
    const r = await this.db.query<{
      level_name: string | null;
      subject_name: string | null;
      school_name: string | null;
    }>(
      `SELECT l.name AS level_name, s.name AS subject_name, tp.school_name
       FROM teacher_profiles tp
       LEFT JOIN levels l ON l.id = tp.level_id
       LEFT JOIN subjects s ON s.id = tp.subject_id
       WHERE tp.user_id = $1`,
      [id],
    );
    const fila = r.rows[0];
    if (!fila) return null;
    return {
      nivelEducativo: fila.level_name ?? null,
      materia: fila.subject_name ?? null,
      institucion: fila.school_name ?? null,
    };
  }
}
