import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../../platform/db/pg.module';
import type { DescargasRepository } from '../../domain/ports/descargas.repository';

@Injectable()
export class DescargasRepositoryPg implements DescargasRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async registrarDescarga(recursoId: string, usuarioId: string | null): Promise<void> {
    await this.pool.query(
      'INSERT INTO downloads (resource_id, user_id, created_at) VALUES ($1, $2, now())',
      [recursoId, usuarioId]
    );

    // CU-08 RN-004: Emisión del evento de analítica correspondiente (audit_log)
    await this.pool.query(
      `INSERT INTO audit_log (action, entity_type, entity_id, actor_user_id, new_values)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        'resource_downloaded',
        'resource',
        recursoId,
        usuarioId, // puede ser null para anónimos
        JSON.stringify({ resource_id: recursoId }),
      ]
    );
  }
}
