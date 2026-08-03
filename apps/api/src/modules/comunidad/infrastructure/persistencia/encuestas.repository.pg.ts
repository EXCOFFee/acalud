import type { Pool, PoolClient } from 'pg';
import type { EncuestasRepository } from '../../domain/ports/encuestas.repository';
import type {
  EncuestaResumen,
  EstadoEncuestaPublica,
  FiltroEncuestas,
  ResultadosEncuesta,
} from '../../domain/encuesta';

type Ejecutor = Pool | PoolClient;

export class EncuestasRepositoryPg implements EncuestasRepository {
  constructor(private readonly db: Ejecutor) {}

  // `draft` nunca es público (CU-16 §4: "activas y finalizadas").
  async listar(filtro: FiltroEncuestas): Promise<EncuestaResumen[]> {
    const r = await this.db.query<{
      id: string;
      question: string;
      status: EstadoEncuestaPublica;
      target_level_id: string | null;
      created_at: Date;
      total_votes: number;
    }>(
      `SELECT p.id, p.question, p.status, p.target_level_id, p.created_at,
              (SELECT count(*)::int FROM poll_responses r WHERE r.poll_id = p.id) AS total_votes
         FROM polls p
        WHERE p.status <> 'draft'
          AND ($1::text IS NULL OR p.status::text = $1)
          AND ($2::uuid IS NULL OR p.target_level_id = $2::uuid)
        ORDER BY p.created_at DESC`,
      [filtro.status ?? null, filtro.levelId ?? null],
    );
    return r.rows.map((f) => ({
      id: f.id,
      question: f.question,
      status: f.status,
      targetLevelId: f.target_level_id,
      totalVotes: f.total_votes,
      createdAt: f.created_at,
    }));
  }

  async obtenerResultados(pollId: string, usuarioId: string | null): Promise<ResultadosEncuesta | null> {
    const poll = await this.db.query<{ question: string; status: EstadoEncuestaPublica }>(
      `SELECT question, status FROM polls WHERE id = $1 AND status <> 'draft'`,
      [pollId],
    );
    const fila = poll.rows[0];
    if (!fila) return null;

    const opciones = await this.db.query<{ id: string; text: string; vote_count: number }>(
      `SELECT o.id, o.text, count(r.id)::int AS vote_count
         FROM poll_options o
         LEFT JOIN poll_responses r ON r.option_id = o.id
        WHERE o.poll_id = $1
        GROUP BY o.id, o.text
        ORDER BY o.id`,
      [pollId],
    );
    const totalVotes = opciones.rows.reduce((suma, o) => suma + o.vote_count, 0);

    let optionIdVotada: string | null = null;
    if (usuarioId !== null) {
      const voto = await this.db.query<{ option_id: string }>(
        `SELECT option_id FROM poll_responses WHERE poll_id = $1 AND user_id = $2`,
        [pollId, usuarioId],
      );
      optionIdVotada = voto.rows[0]?.option_id ?? null;
    }

    return {
      pollId,
      question: fila.question,
      status: fila.status,
      totalVotes,
      // RN-006: redondeo a 1 decimal. Sin votos, 0 % para todas (RN-007).
      opciones: opciones.rows.map((o) => ({
        id: o.id,
        text: o.text,
        voteCount: o.vote_count,
        percentage: totalVotes === 0 ? 0 : Math.round((o.vote_count / totalVotes) * 1000) / 10,
      })),
      hasUserVoted: optionIdVotada !== null,
      optionIdVotada,
    };
  }
}
