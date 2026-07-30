import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OutboxWorker } from '../../src/platform/outbox/outbox-worker';
import { type CtxApp, levantarApp } from './helpers/app';

const PW = 'correcta-bateria-caballo-grapa';

let ctx: CtxApp;

beforeAll(async () => {
  ctx = await levantarApp();
});

afterAll(async () => {
  await ctx?.detener();
});

describe('CU-E05 · Worker de outbox', () => {
  it('procesa los emails pendientes y los marca enviados (con el adapter fake)', async () => {
    const email = `${randomUUID()}@escuela.edu.ar`;
    await ctx.request
      .post('/api/v1/auth/registro')
      .send({ email, contrasena: PW, nombre: 'María', apellido: 'Pérez' });

    const antes = await ctx.pg.query(
      `SELECT status, subject, body FROM outbox_emails WHERE recipient = $1`,
      [email],
    );
    expect(antes.rows[0]?.status).toBe('pending');
    // El mensaje se encola YA renderizado: la fila es el correo, no una receta para armarlo.
    expect(antes.rows[0]?.subject).toBe('Verificá tu cuenta en Acalud');
    expect(antes.rows[0]?.body).toContain('/verificar?token=');

    const worker = ctx.app.get(OutboxWorker);
    const enviados = await worker.procesar();
    expect(enviados).toBeGreaterThan(0);

    const despues = await ctx.pg.query(
      `SELECT status, sent_at FROM outbox_emails WHERE recipient = $1`,
      [email],
    );
    expect(despues.rows[0]?.status).toBe('sent');
    expect(despues.rows[0]?.sent_at).not.toBeNull();
  });
});
