import type { PoolClient } from 'pg';
import type { AdminDestino, PropuestasRepository } from '../../domain/ports/propuestas.repository';
import type {
  DatosPropuesta,
  EstadoPropuesta,
  FiltroPropuestasAdmin,
  Propuesta,
  PropuestaDetalleAdmin,
  PropuestaResumen,
  PropuestaResumenAdmin,
} from '../../domain/propuesta';

interface FilaPropuesta {
  id: string;
  user_id: string;
  title: string;
  description: string;
  subject_id: string | null;
  target_level_id: string | null;
  status: EstadoPropuesta;
  admin_feedback: string | null;
  created_at: Date;
  updated_at: Date;
}

function aPropuesta(fila: FilaPropuesta): Propuesta {
  return {
    id: fila.id,
    userId: fila.user_id,
    title: fila.title,
    description: fila.description,
    subjectId: fila.subject_id,
    targetLevelId: fila.target_level_id,
    status: fila.status,
    adminFeedback: fila.admin_feedback,
    createdAt: fila.created_at,
    updatedAt: fila.updated_at,
  };
}

export class PropuestasRepositoryPg implements PropuestasRepository {
  constructor(private readonly client: PoolClient) {}

  async existeMateria(subjectId: string): Promise<boolean> {
    const r = await this.client.query('SELECT 1 FROM subjects WHERE id = $1', [subjectId]);
    return r.rowCount !== null && r.rowCount > 0;
  }

  async existeNivel(nivelId: string): Promise<boolean> {
    const r = await this.client.query('SELECT 1 FROM levels WHERE id = $1', [nivelId]);
    return r.rowCount !== null && r.rowCount > 0;
  }

  async existeDuplicadaReciente(userId: string, title: string): Promise<boolean> {
    const r = await this.client.query(
      `SELECT 1 FROM proposals
        WHERE user_id = $1 AND lower(title) = lower($2) AND created_at > now() - interval '24 hours'`,
      [userId, title],
    );
    return r.rowCount !== null && r.rowCount > 0;
  }

  async crear(userId: string, datos: DatosPropuesta): Promise<Propuesta> {
    const r = await this.client.query<FilaPropuesta>(
      `INSERT INTO proposals (user_id, title, description, subject_id, target_level_id, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [userId, datos.title, datos.description, datos.subjectId, datos.targetLevelId],
    );
    return aPropuesta(r.rows[0]!);
  }

  async listarPropias(userId: string): Promise<PropuestaResumen[]> {
    const r = await this.client.query<{
      id: string;
      title: string;
      status: EstadoPropuesta;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, title, status, created_at, updated_at
         FROM proposals
        WHERE user_id = $1
        ORDER BY created_at DESC`,
      [userId],
    );
    return r.rows.map((f) => ({
      id: f.id,
      title: f.title,
      status: f.status,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
    }));
  }

  async listarAdministradores(): Promise<AdminDestino[]> {
    const r = await this.client.query<{ id: string; email: string; full_name: string }>(
      `SELECT id, email, full_name FROM users WHERE role = 'admin'`,
    );
    return r.rows.map((f) => ({ id: f.id, email: f.email, nombre: f.full_name }));
  }

  async listarAdmin(filtro: FiltroPropuestasAdmin): Promise<PropuestaResumenAdmin[]> {
    const orden = filtro.ordenDir === 'asc' ? 'ASC' : 'DESC';
    const r = await this.client.query<{
      id: string;
      title: string;
      full_name: string;
      status: EstadoPropuesta;
      created_at: Date;
    }>(
      `SELECT p.id, p.title, u.full_name, p.status, p.created_at
         FROM proposals p JOIN users u ON u.id = p.user_id
        WHERE ($1::text IS NULL OR p.status::text = $1)
          AND ($2::text IS NULL OR p.title ILIKE '%' || $2 || '%'
                                 OR p.description ILIKE '%' || $2 || '%'
                                 OR u.full_name ILIKE '%' || $2 || '%')
        ORDER BY p.created_at ${orden}`,
      [filtro.status ?? null, filtro.search ?? null],
    );
    return r.rows.map((f) => ({
      id: f.id,
      title: f.title,
      autorNombre: f.full_name,
      status: f.status,
      createdAt: f.created_at,
    }));
  }

  async obtenerAdmin(id: string): Promise<PropuestaDetalleAdmin | null> {
    const r = await this.client.query<FilaPropuesta & { full_name: string; email: string }>(
      `SELECT p.*, u.full_name, u.email
         FROM proposals p JOIN users u ON u.id = p.user_id
        WHERE p.id = $1`,
      [id],
    );
    const fila = r.rows[0];
    if (!fila) return null;
    return { ...aPropuesta(fila), autorNombre: fila.full_name, autorEmail: fila.email };
  }

  async actualizarEstado(
    id: string,
    status: EstadoPropuesta,
    feedback: string | null,
  ): Promise<Propuesta | null> {
    const r = await this.client.query<FilaPropuesta>(
      `UPDATE proposals SET status = $2, admin_feedback = $3 WHERE id = $1 RETURNING *`,
      [id, status, feedback],
    );
    return r.rows[0] ? aPropuesta(r.rows[0]) : null;
  }
}
