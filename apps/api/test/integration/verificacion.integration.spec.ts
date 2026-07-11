import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

const PW = 'correcta-bateria-caballo-grapa';

let ctx: CtxApp;

beforeAll(async () => {
  ctx = await levantarApp();
});

afterAll(async () => {
  await ctx?.detener();
});

async function registrarYTomarToken(email: string): Promise<string> {
  await ctx.request
    .post('/api/v1/auth/registro')
    .send({ email, contrasena: PW, nombre: 'María', apellido: 'Pérez' });
  const r = await ctx.pg.query<{ payload: { token?: string } }>(
    `SELECT payload FROM outbox_emails
      WHERE destinatario = $1 AND tipo = 'verificacion_email'
      ORDER BY creado_en DESC LIMIT 1`,
    [email],
  );
  return r.rows[0]?.payload.token ?? '';
}

describe('CU-E02 · Verificar email', () => {
  it('token vigente verifica la cuenta e inicia sesión (cookie)', async () => {
    const email = `${randomUUID()}@escuela.edu.ar`;
    const token = await registrarYTomarToken(email);
    expect(token.length).toBeGreaterThan(0);

    const res = await ctx.request.post('/api/v1/auth/verificacion').send({ token });
    expect(res.status).toBe(200);
    expect(res.body.capacidades_limitadas).toBe(false);
    const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined;
    expect(setCookie?.some((c) => c.startsWith('acalud_sesion='))).toBe(true);

    const cuenta = await ctx.pg.query(`SELECT estado FROM cuentas WHERE email = $1`, [email]);
    expect(cuenta.rows[0]?.estado).toBe('verificada');
  });

  it('token ya usado no re-verifica (410)', async () => {
    const email = `${randomUUID()}@escuela.edu.ar`;
    const token = await registrarYTomarToken(email);
    await ctx.request.post('/api/v1/auth/verificacion').send({ token }); // primer uso
    const segundo = await ctx.request.post('/api/v1/auth/verificacion').send({ token });
    expect(segundo.status).toBe(410);
  });

  it('token inexistente responde 410', async () => {
    const res = await ctx.request
      .post('/api/v1/auth/verificacion')
      .send({ token: 'no-existe-este-token' });
    expect(res.status).toBe(410);
  });
});
