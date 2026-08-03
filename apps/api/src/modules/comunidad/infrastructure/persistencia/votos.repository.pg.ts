import type { Pool } from 'pg';
import { EncuestaYaVotada } from '../../domain/errores';
import type { VotosRepository } from '../../domain/ports/votos.repository';

const PG_VIOLACION_UNICIDAD = '23505';
const UQ_POLL_USER = 'uq_poll_user';

export class VotosRepositoryPg implements VotosRepository {
  constructor(private readonly pool: Pool) {}

  async buscarEncuestaVotable(pollId: string): Promise<{ id: string } | null> {
    const r = await this.pool.query<{ id: string }>(
      `SELECT id FROM polls WHERE id = $1 AND status = 'active'`,
      [pollId],
    );
    return r.rows[0] ?? null;
  }

  async existeOpcion(pollId: string, optionId: string): Promise<boolean> {
    const r = await this.pool.query('SELECT 1 FROM poll_options WHERE id = $1 AND poll_id = $2', [
      optionId,
      pollId,
    ]);
    return r.rowCount !== null && r.rowCount > 0;
  }

  async votar(pollId: string, optionId: string, userId: string): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO poll_responses (poll_id, option_id, user_id) VALUES ($1, $2, $3)`,
        [pollId, optionId, userId],
      );
    } catch (e) {
      const err = e as { code?: string; constraint?: string };
      if (err.code === PG_VIOLACION_UNICIDAD && err.constraint === UQ_POLL_USER) {
        throw new EncuestaYaVotada();
      }
      throw e;
    }
  }
}
