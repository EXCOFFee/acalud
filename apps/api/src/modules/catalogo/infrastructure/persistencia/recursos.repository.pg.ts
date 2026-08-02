import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../../platform/db/pg.module';
import type { Recurso, RecursosRepository } from '../../domain/ports/recursos.repository';

@Injectable()
export class RecursosRepositoryPg implements RecursosRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async obtener(id: string): Promise<Recurso | null> {
    const res = await this.pool.query(
      'SELECT id, product_id, title, is_licensed, type, url FROM resources WHERE id = $1',
      [id]
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      id: row.id,
      productoId: row.product_id,
      titulo: row.title,
      isLicensed: row.is_licensed,
      type: row.type,
      url: row.url,
    };
  }

  async incrementarDescargas(id: string): Promise<void> {
    await this.pool.query(
      'UPDATE resources SET download_count = download_count + 1 WHERE id = $1',
      [id]
    );
  }
}
