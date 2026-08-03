import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../../platform/db/pg.module';
import { DemoNoEncontrada, JuegoNoEncontrado } from '../../domain/errores';
import type { ContenidoDemo, DemosRepository } from '../../domain/ports/demos.repository';

@Injectable()
export class DemosRepositoryPg implements DemosRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async obtenerDemo(juegoId: string, tipo: 'publica' | 'completa'): Promise<ContenidoDemo> {
    // 1. Verificamos si el producto existe y está publicado (is_active, no hay columna `status`).
    const prodRes = await this.pool.query(
      'SELECT is_active FROM products WHERE id = $1',
      [juegoId]
    );

    if (prodRes.rows.length === 0 || prodRes.rows[0].is_active !== true) {
      throw new JuegoNoEncontrado();
    }

    // 2. Buscamos la demo asociada
    const demoRes = await this.pool.query(
      'SELECT id, config_json FROM demos WHERE product_id = $1',
      [juegoId]
    );

    if (demoRes.rows.length === 0) {
      throw new DemoNoEncontrada();
    }

    const { id, config_json } = demoRes.rows[0];
    
    // Validamos que sea del tipo solicitado
    if (config_json.tipo !== tipo) {
      throw new DemoNoEncontrada();
    }

    return {
      juegoId,
      demoId: id,
      tipo: config_json.tipo,
      formato: config_json.formato,
      urlEmbebido: config_json.contenido_ref,
    };
  }

  async registrarPrueba(docenteId: string, juegoId: string, demoId: string): Promise<void> {
    // CU-07: Registra el evento en game_progress como "isDemo" (según Matriz F6 y OK del usuario)
    const query = `
      INSERT INTO game_progress (user_id, product_id, progress_data, last_played_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id, product_id)
      DO UPDATE SET
        progress_data = game_progress.progress_data || EXCLUDED.progress_data,
        last_played_at = NOW()
    `;
    
    const progressData = JSON.stringify({ isDemo: true, demoId });
    
    await this.pool.query(query, [docenteId, juegoId, progressData]);
  }
}
