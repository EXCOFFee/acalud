import { Controller, Get } from '@nestjs/common';

/**
 * Endpoints de salud (NFR-O3).
 * - `/health`: liveness, sin dependencias.
 * - `/ready`: readiness; en producción toca PostgreSQL como keep-alive de Supabase y
 *   señal del monitor sintético (ADR-005). En la Etapa 0 aún no hay BD, así que reporta
 *   "ok" sin dependencias hasta la migración inicial (tarea 0.2).
 */
@Controller()
export class HealthController {
  @Get('health')
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  readiness(): { status: string; dependencias: Record<string, 'ok' | 'down'> } {
    // TODO(0.2): verificar conexión a PostgreSQL; responder 503 si la dependencia cae.
    return { status: 'ok', dependencias: {} };
  }
}
