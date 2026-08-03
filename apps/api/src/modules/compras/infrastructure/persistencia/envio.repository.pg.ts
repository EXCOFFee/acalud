import type { Pool } from 'pg';
import type { EnvioRepository } from '../../domain/ports/envio.repository';

export class EnvioRepositoryPg implements EnvioRepository {
  constructor(private readonly pool: Pool) {}

  async obtenerPesos(productoIds: string[]): Promise<Map<string, number | null>> {
    if (productoIds.length === 0) return new Map();
    const r = await this.pool.query<{ id: string; weight_grams: number | null }>(
      `SELECT id, weight_grams FROM products WHERE id = ANY($1::uuid[])`,
      [productoIds],
    );
    return new Map(r.rows.map((f) => [f.id, f.weight_grams]));
  }
}
