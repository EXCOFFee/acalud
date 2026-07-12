import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/pg.module';

type Estado = 'ok' | 'down';

/**
 * Endpoints de salud (NFR-O3, ADR-005).
 * - `/health`: liveness, sin dependencias.
 * - `/ready`: readiness; toca PostgreSQL (`SELECT 1`) → 503 si la BD cae. El monitor sintético
 *   (UptimeRobot, cada 5 min) lo usa como señal del SLO y, de paso, como keep-alive: evita el
 *   spin-down de Render y la pausa por inactividad de Supabase.
 */
@Controller()
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get('health')
  liveness(): { status: Estado } {
    return { status: 'ok' };
  }

  @Get('ready')
  async readiness(
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ status: Estado; dependencias: Record<string, Estado> }> {
    const db = await this.pingDb();
    if (!db) res.status(503);
    return { status: db ? 'ok' : 'down', dependencias: { db: db ? 'ok' : 'down' } };
  }

  /** `SELECT 1` con timeout acotado: una BD colgada no debe colgar el health check. */
  private async pingDb(): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.pool.query('SELECT 1'),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('db timeout')), 5000);
        }),
      ]);
      return true;
    } catch {
      return false;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
}
