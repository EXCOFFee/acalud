import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// Escenarios Gherkin de CU-E01 (recuperación) contra la app REAL + PostgreSQL real.
const PW_VIEJA = 'correcta-bateria-caballo-grapa';
const PW_NUEVA = 'nueva-fortaleza-tablero-2026';

let ctx: CtxApp;

beforeAll(async () => {
  ctx = await levantarApp();
});

afterAll(async () => {
  await ctx?.detener();
});

function emailNuevo(): string {
  return `${randomUUID()}@escuela.edu.ar`;
}

function registrar(email: string, contrasena = PW_VIEJA) {
  return ctx.request
    .post('/api/v1/auth/registro')
    .send({ email, contrasena, nombre: 'María', apellido: 'Pérez' });
}

function login(email: string, contrasena: string) {
  return ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena });
}

async function solicitarYTomarToken(email: string): Promise<string> {
  await ctx.request.post('/api/v1/auth/recuperacion').send({ email });
  const r = await ctx.pg.query<{ payload: { token?: string } }>(
    `SELECT payload FROM outbox_emails
      WHERE destinatario = $1 AND tipo = 'recuperacion_password'
      ORDER BY creado_en DESC LIMIT 1`,
    [email],
  );
  return r.rows[0]?.payload.token ?? '';
}

describe('CU-E01 · Recuperar contraseña', () => {
  it('@scenario:AUT-CUE01-HAPPY-001 · restablecer invalida sesiones y tokens previos', async () => {
    const email = emailNuevo();
    await registrar(email);
    const sesionVieja = (await login(email, PW_VIEJA)).body.token as string;
    // La sesión vieja está activa antes del reset.
    expect((await ctx.request.get('/api/v1/me').set('Authorization', `Bearer ${sesionVieja}`)).status).toBe(200);

    const token = await solicitarYTomarToken(email);
    expect(token.length).toBeGreaterThan(0);

    const reset = await ctx.request
      .post('/api/v1/auth/recuperacion/restablecer')
      .send({ token, contrasena_nueva: PW_NUEVA });
    expect(reset.status).toBe(200);

    // La contraseña anterior ya no permite iniciar sesión.
    expect((await login(email, PW_VIEJA)).status).toBe(401);
    // La nueva sí.
    expect((await login(email, PW_NUEVA)).status).toBe(200);
    // La sesión previamente activa quedó invalidada.
    expect((await ctx.request.get('/api/v1/me').set('Authorization', `Bearer ${sesionVieja}`)).status).toBe(401);
    // Doble efecto: la cuenta quedó verificada (evita cuentas zombies).
    const cuenta = await ctx.pg.query(`SELECT estado FROM cuentas WHERE email = $1`, [email]);
    expect(cuenta.rows[0]?.estado).toBe('verificada');
  });

  it('el token de recuperación es de un solo uso (410 al reusar)', async () => {
    const email = emailNuevo();
    await registrar(email);
    const token = await solicitarYTomarToken(email);
    await ctx.request
      .post('/api/v1/auth/recuperacion/restablecer')
      .send({ token, contrasena_nueva: PW_NUEVA }); // primer uso
    const segundo = await ctx.request
      .post('/api/v1/auth/recuperacion/restablecer')
      .send({ token, contrasena_nueva: PW_NUEVA });
    expect(segundo.status).toBe(410);
  });

  it('token inexistente responde 410', async () => {
    const res = await ctx.request
      .post('/api/v1/auth/recuperacion/restablecer')
      .send({ token: 'no-existe', contrasena_nueva: PW_NUEVA });
    expect(res.status).toBe(410);
  });

  it('contraseña nueva filtrada se rechaza con 422', async () => {
    const email = emailNuevo();
    await registrar(email);
    const token = await solicitarYTomarToken(email);
    const res = await ctx.request
      .post('/api/v1/auth/recuperacion/restablecer')
      .send({ token, contrasena_nueva: '123456789012' }); // en la lista de filtradas
    expect(res.status).toBe(422);
  });

  it('@scenario:AUT-CUE01-ALT-001 · la solicitud no revela si el email existe', async () => {
    const inexistente = `nadie-${randomUUID()}@nada.com`;
    const res = await ctx.request.post('/api/v1/auth/recuperacion').send({ email: inexistente });
    expect(res.status).toBe(202);

    // No se encola ningún email para un destinatario inexistente.
    const outbox = await ctx.pg.query(
      `SELECT count(*)::int AS n FROM outbox_emails WHERE destinatario = $1`,
      [inexistente],
    );
    expect(outbox.rows[0]?.n).toBe(0);
  });
});
