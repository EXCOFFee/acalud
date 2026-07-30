import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/pg.module';
import { EMAIL_PROVIDER, type EmailProvider } from '../email/email-provider.port';

interface FilaOutbox {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  attempts: number;
}

// Valores del tipo `estado_outbox`, en un solo lugar: un renombre en una migración se refleja
// acá y no rompe en silencio las consultas del worker.
const ESTADO_PENDIENTE = 'pending';
const ESTADO_ENVIADO = 'sent';
const ESTADO_FALLIDO = 'failed';

const MAX_INTENTOS = 6; // PG-03
const LOTE = 20;
const INTERVALO_MS = 10_000;

/**
 * Worker del outbox (CU-E05), in-process (ADR-005: un solo servicio). Lee los emails
 * pendientes y los manda por el EmailProvider; idempotente por `id`. Reintenta hasta
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
        `SELECT id, recipient, subject, body, attempts
           FROM outbox_emails
          WHERE status <> $3 AND attempts < $1
          ORDER BY created_at
          LIMIT $2`,
        [MAX_INTENTOS, LOTE, ESTADO_ENVIADO],
      );

      for (const fila of rows) {
        try {
          // `id` es la clave de idempotencia ante el proveedor: la fila es el mensaje.
          await this.email.enviar({
            email_id: fila.id,
            destinatario: fila.recipient,
            asunto: fila.subject,
            cuerpo: fila.body,
          });
          await this.pool.query(
            `UPDATE outbox_emails
                SET status = $2, sent_at = now(), attempts = attempts + 1
              WHERE id = $1`,
            [fila.id, ESTADO_ENVIADO],
          );
          enviados++;
        } catch (error) {
          const intentos = fila.attempts + 1;
          await this.pool.query(
            `UPDATE outbox_emails SET status = $2, attempts = $3, last_error = $4 WHERE id = $1`,
            [
              fila.id,
              intentos >= MAX_INTENTOS ? ESTADO_FALLIDO : ESTADO_PENDIENTE,
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
