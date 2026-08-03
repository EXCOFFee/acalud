import type { PoolClient } from 'pg';
import type { DemosAdminRepository } from '../../domain/ports/demos-admin.repository';
import type { DemoAdmin } from '../../domain/demo-admin';

export class DemosAdminRepositoryPg implements DemosAdminRepository {
  constructor(private readonly client: PoolClient) {}

  async upsert(productId: string, configJson: Record<string, unknown>): Promise<DemoAdmin> {
    const r = await this.client.query<{ id: string; product_id: string; config_json: Record<string, unknown> }>(
      `INSERT INTO demos (product_id, config_json)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (product_id) DO UPDATE SET config_json = EXCLUDED.config_json
       RETURNING id, product_id, config_json`,
      [productId, JSON.stringify(configJson)],
    );
    const fila = r.rows[0]!;
    return { id: fila.id, productId: fila.product_id, configJson: fila.config_json };
  }
}
