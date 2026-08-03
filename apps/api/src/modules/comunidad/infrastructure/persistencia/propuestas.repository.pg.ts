import type { PoolClient } from 'pg';
import type { AdminDestino, PropuestasRepository } from '../../domain/ports/propuestas.repository';
import type { DatosPropuesta, EstadoPropuesta, Propuesta, PropuestaResumen } from '../../domain/propuesta';

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
}
