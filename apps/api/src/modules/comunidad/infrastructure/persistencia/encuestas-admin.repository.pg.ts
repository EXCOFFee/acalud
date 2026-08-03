import type { PoolClient } from 'pg';
import type { EncuestasAdminRepository } from '../../domain/ports/encuestas-admin.repository';
import type {
  DatosEncuesta,
  EncuestaAdmin,
  EncuestaAdminResumen,
  EstadoEncuesta,
} from '../../domain/encuesta-admin';

interface FilaEncuesta {
  id: string;
  question: string;
  status: EstadoEncuesta;
  target_level_id: string | null;
  created_at: Date;
  opciones: { id: string; text: string }[];
}

function aEncuestaAdmin(fila: FilaEncuesta): EncuestaAdmin {
  return {
    id: fila.id,
    question: fila.question,
    status: fila.status,
    targetLevelId: fila.target_level_id,
    createdAt: fila.created_at,
    opciones: fila.opciones,
  };
}

const SELECT_CON_OPCIONES = `
  SELECT p.id, p.question, p.status, p.target_level_id, p.created_at,
         COALESCE(
           (SELECT json_agg(json_build_object('id', o.id, 'text', o.text) ORDER BY o.id)
              FROM poll_options o WHERE o.poll_id = p.id),
           '[]'
         ) AS opciones
    FROM polls p`;

export class EncuestasAdminRepositoryPg implements EncuestasAdminRepository {
  constructor(private readonly client: PoolClient) {}

  async listar(): Promise<EncuestaAdminResumen[]> {
    const r = await this.client.query<{
      id: string;
      question: string;
      status: EstadoEncuesta;
      created_at: Date;
      total_votes: number;
    }>(
      `SELECT p.id, p.question, p.status, p.created_at,
              (SELECT count(*)::int FROM poll_responses r WHERE r.poll_id = p.id) AS total_votes
         FROM polls p
        ORDER BY p.created_at DESC`,
    );
    return r.rows.map((f) => ({
      id: f.id,
      question: f.question,
      status: f.status,
      createdAt: f.created_at,
      totalVotes: f.total_votes,
    }));
  }

  async obtener(id: string): Promise<EncuestaAdmin | null> {
    const r = await this.client.query<FilaEncuesta>(`${SELECT_CON_OPCIONES} WHERE p.id = $1`, [id]);
    return r.rows[0] ? aEncuestaAdmin(r.rows[0]) : null;
  }

  async existeNivel(nivelId: string): Promise<boolean> {
    const r = await this.client.query('SELECT 1 FROM levels WHERE id = $1', [nivelId]);
    return r.rowCount !== null && r.rowCount > 0;
  }

  async crear(datos: DatosEncuesta): Promise<EncuestaAdmin> {
    // status arranca en 'draft' (RN-004: inactiva hasta activación manual).
    const poll = await this.client.query<{ id: string }>(
      `INSERT INTO polls (question, target_level_id, status) VALUES ($1, $2, 'draft') RETURNING id`,
      [datos.question, datos.targetLevelId],
    );
    const pollId = poll.rows[0]!.id;
    await this.insertarOpciones(pollId, datos.opciones);
    return (await this.obtener(pollId))!;
  }

  async actualizar(id: string, datos: DatosEncuesta): Promise<EncuestaAdmin | null> {
    const r = await this.client.query(
      `UPDATE polls SET question = $2, target_level_id = $3 WHERE id = $1`,
      [id, datos.question, datos.targetLevelId],
    );
    if (r.rowCount === 0) return null;

    // A2.9: reemplaza el set completo de opciones (más simple y menos propenso a error que un
    // diff parcial; las opciones no tienen identidad fuera de la encuesta).
    await this.client.query(`DELETE FROM poll_options WHERE poll_id = $1`, [id]);
    await this.insertarOpciones(id, datos.opciones);

    return this.obtener(id);
  }

  async alternarEstado(id: string): Promise<EncuestaAdmin | null> {
    // Sólo draft↔active: CU-20 no define ninguna transición hacia/desde 'closed'.
    const r = await this.client.query(
      `UPDATE polls SET status = CASE
         WHEN status = 'draft' THEN 'active'
         WHEN status = 'active' THEN 'draft'
         ELSE status
       END
       WHERE id = $1
       RETURNING id`,
      [id],
    );
    if (r.rowCount === 0) return null;
    return this.obtener(id);
  }

  async eliminar(id: string): Promise<boolean> {
    const r = await this.client.query(`DELETE FROM polls WHERE id = $1`, [id]);
    return (r.rowCount ?? 0) > 0;
  }

  private async insertarOpciones(pollId: string, opciones: string[]): Promise<void> {
    for (const texto of opciones) {
      await this.client.query(`INSERT INTO poll_options (poll_id, text) VALUES ($1, $2)`, [
        pollId,
        texto,
      ]);
    }
  }
}
