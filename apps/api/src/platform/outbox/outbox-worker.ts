import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/pg.module';
import { EMAIL_PROVIDER, type EmailProvider } from '../email/email-provider.port';
import { renderizar } from './plantillas';

interface FilaOutbox {
  id: string;
  email_id: string;
  tipo: string;
  destinatario: string;
  payload: Record<string, unknown>;
  intentos: number;
}

const MAX_INTENTOS = 6; // PG-03
const LOTE = 20;
const INTERVALO_MS = 10_000;

/**
 * Worker del outbox (CU-E05), in-process (ADR-005: un solo servicio). Lee los emails
 * pendientes y los manda por el EmailProvider; idempotente por `email_id`. Reintenta hasta
 * MAX_INTENTOS; luego marca `fallido` (visible para reintento manual del Admin).
 */
@Injectable()
export class OutboxWorker implements OnApplicationBootstrap, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private procesando = false;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(EMAIL_PROVIDER) private readonly email: EmailProvider,
  ) {}

  onApplicationBootstrap(): void {
    // En tests, el loop no arranca: los tests llaman procesar() a mano.
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => {
      void this.procesar();
    }, INTERVALO_MS);
  }

  onModuleDestroy(): void {
    if (this.timer !== null) clearInterval(this.timer);
  }

  /** Procesa un lote de emails pendientes. Devuelve cuántos se enviaron. */
  async procesar(): Promise<number> {
    if (this.procesando) return 0;
    this.procesando = true;
    let enviados = 0;
    try {
      const { rows } = await this.pool.query<FilaOutbox>(
        `SELECT id, email_id, tipo, destinatario, payload, intentos
           FROM outbox_emails
          WHERE estado <> 'enviado' AND intentos < $1
          ORDER BY creado_en
          LIMIT $2`,
        [MAX_INTENTOS, LOTE],
      );

      for (const fila of rows) {
        const plantilla = renderizar(fila.tipo, fila.payload);
        if (plantilla === null) {
          await this.pool.query(
            `UPDATE outbox_emails SET estado = 'fallido', ultimo_error = $2 WHERE id = $1`,
            [fila.id, `tipo sin plantilla: ${fila.tipo}`],
          );
          continue;
        }
        try {
          await this.email.enviar({
            email_id: fila.email_id,
            destinatario: fila.destinatario,
            asunto: plantilla.asunto,
            cuerpo: plantilla.html,
          });
          await this.pool.query(
            `UPDATE outbox_emails
                SET estado = 'enviado', procesado_en = now(), intentos = intentos + 1
              WHERE id = $1`,
            [fila.id],
          );
          enviados++;
        } catch (error) {
          const intentos = fila.intentos + 1;
          await this.pool.query(
            `UPDATE outbox_emails SET estado = $2, intentos = $3, ultimo_error = $4 WHERE id = $1`,
            [
              fila.id,
              intentos >= MAX_INTENTOS ? 'fallido' : 'pendiente',
              intentos,
              (error as Error).message.slice(0, 300),
            ],
          );
        }
      }
    } finally {
      this.procesando = false;
    }
    return enviados;
  }
}
