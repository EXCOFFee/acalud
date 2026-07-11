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

    const antes = await ctx.pg.query(`SELECT estado FROM outbox_emails WHERE destinatario = $1`, [
      email,
    ]);
    expect(antes.rows[0]?.estado).toBe('pendiente');

    const worker = ctx.app.get(OutboxWorker);
    const enviados = await worker.procesar();
    expect(enviados).toBeGreaterThan(0);

    const despues = await ctx.pg.query(
      `SELECT estado, procesado_en FROM outbox_emails WHERE destinatario = $1`,
      [email],
    );
    expect(despues.rows[0]?.estado).toBe('enviado');
    expect(despues.rows[0]?.procesado_en).not.toBeNull();
  });
});
