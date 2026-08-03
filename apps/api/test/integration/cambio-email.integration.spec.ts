import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-34 · Cambiar Correo Electrónico, contra la app REAL + PostgreSQL real (Testcontainers).
const PW = 'correcta-bateria-caballo-grapa';

let ctx: CtxApp;

beforeAll(async () => {
  ctx = await levantarApp();
});

afterAll(async () => {
  await ctx?.detener();
});

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

function emailNuevo(): string {
  return `${randomUUID()}@escuela.edu.ar`;
}

async function registrarYLoguear(contrasena = PW): Promise<{ token: string; email: string }> {
  const email = emailNuevo();
  await ctx.request.post('/api/v1/auth/registro').send({ email, contrasena, nombre: 'N', apellido: 'A' });
  const login = await ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena });
  return { token: login.body.token as string, email };
}

async function tomarTokenCambio(destinatario: string): Promise<string> {
  const r = await ctx.pg.query<{ body: string }>(
    `SELECT body FROM outbox_emails
      WHERE recipient = $1 AND template = 'cambio_email_verificacion'
      ORDER BY created_at DESC LIMIT 1`,
    [destinatario],
  );
  const enlace = /[?&]token=([^"&\s]+)/.exec(r.rows[0]?.body ?? '');
  return enlace === null ? '' : decodeURIComponent(enlace[1] as string);
}

async function contarOutbox(template: string, destinatario: string): Promise<number> {
  const r = await ctx.pg.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM outbox_emails WHERE template = $1 AND recipient = $2`,
    [template, destinatario],
  );
  return r.rows[0]?.n ?? 0;
}

describe('CU-34 · Cambiar correo electrónico', () => {
  it('flujo principal: pide el cambio, confirma el testigo y el correo queda actualizado sin cerrar sesión', async () => {
    const { token, email } = await registrarYLoguear();
    const nuevo = emailNuevo();

    const solicitud = await ctx.request
      .post('/api/v1/me/cambio-correo')
      .set(bearer(token))
      .send({ nuevo_email: nuevo, contrasena: PW });
    expect(solicitud.status).toBe(202);

    // Hasta la confirmación, el correo anterior sigue vigente y operativo (RN-003/RN-004).
    expect((await ctx.request.get('/api/v1/me').set(bearer(token))).body.email).toBe(email);

    const tokenCambio = await tomarTokenCambio(nuevo);
    expect(tokenCambio.length).toBeGreaterThan(0);

    const confirmar = await ctx.request.post('/api/v1/auth/cambio-correo/confirmar').send({ token: tokenCambio });
    expect(confirmar.status).toBe(200);

    // La sesión activa sigue funcionando (paso 26 es opcional; RN-004: nunca inaccesible).
    const perfil = await ctx.request.get('/api/v1/me').set(bearer(token));
    expect(perfil.status).toBe(200);
    expect(perfil.body.email).toBe(nuevo);

    // Login ahora funciona con el correo nuevo.
    expect((await ctx.request.post('/api/v1/auth/sesion').send({ email: nuevo, contrasena: PW })).status).toBe(200);

    // Se notificó a ambas direcciones (RN-009/RN-010).
    expect(await contarOutbox('cambio_email_confirmado_anterior', email)).toBe(1);
    expect(await contarOutbox('cambio_email_confirmado_nuevo', nuevo)).toBe(1);

    // email_verified queda true (paso 19).
    const fila = await ctx.pg.query(`SELECT email_verified FROM users WHERE email = $1`, [nuevo]);
    expect(fila.rows[0]?.email_verified).toBe(true);
  });

  it('A1: contraseña vigente incorrecta → 401, no se envía correo de verificación', async () => {
    const { token } = await registrarYLoguear();
    const nuevo = emailNuevo();

    const res = await ctx.request
      .post('/api/v1/me/cambio-correo')
      .set(bearer(token))
      .send({ nuevo_email: nuevo, contrasena: 'incorrecta-esta-contrasena' });
    expect(res.status).toBe(401);
    expect(await contarOutbox('cambio_email_verificacion', nuevo)).toBe(0);
  });

  it('A2: nuevo correo ya registrado en otra cuenta → 422 genérico, sin revelar la otra cuenta', async () => {
    const otro = await registrarYLoguear();
    const { token } = await registrarYLoguear();

    const res = await ctx.request
      .post('/api/v1/me/cambio-correo')
      .set(bearer(token))
      .send({ nuevo_email: otro.email, contrasena: PW });
    expect(res.status).toBe(422);
    expect(res.body.detail).not.toContain(otro.email);
    expect(await contarOutbox('cambio_email_verificacion', otro.email)).toBe(0);
  });

  it('A3: nuevo correo igual al actual → 422', async () => {
    const { token, email } = await registrarYLoguear();
    const res = await ctx.request
      .post('/api/v1/me/cambio-correo')
      .set(bearer(token))
      .send({ nuevo_email: email, contrasena: PW });
    expect(res.status).toBe(422);
  });

  it('el testigo de cambio es de un solo uso (410 al reusar) y uno inexistente también da 410', async () => {
    const { token } = await registrarYLoguear();
    const nuevo = emailNuevo();
    await ctx.request.post('/api/v1/me/cambio-correo').set(bearer(token)).send({ nuevo_email: nuevo, contrasena: PW });
    const tokenCambio = await tomarTokenCambio(nuevo);

    expect((await ctx.request.post('/api/v1/auth/cambio-correo/confirmar').send({ token: tokenCambio })).status).toBe(
      200,
    );
    const segundo = await ctx.request.post('/api/v1/auth/cambio-correo/confirmar').send({ token: tokenCambio });
    expect(segundo.status).toBe(410);

    const inexistente = await ctx.request
      .post('/api/v1/auth/cambio-correo/confirmar')
      .send({ token: 'no-existe' });
    expect(inexistente.status).toBe(410);
  });

  it('sin sesión, /me/cambio-correo responde 401', async () => {
    const res = await ctx.request.post('/api/v1/me/cambio-correo').send({ nuevo_email: emailNuevo(), contrasena: PW });
    expect(res.status).toBe(401);
  });

  it('una segunda solicitud de cambio invalida el testigo de la primera', async () => {
    const { token } = await registrarYLoguear();
    const primerNuevo = emailNuevo();
    const segundoNuevo = emailNuevo();

    await ctx.request
      .post('/api/v1/me/cambio-correo')
      .set(bearer(token))
      .send({ nuevo_email: primerNuevo, contrasena: PW });
    const tokenPrimero = await tomarTokenCambio(primerNuevo);

    await ctx.request
      .post('/api/v1/me/cambio-correo')
      .set(bearer(token))
      .send({ nuevo_email: segundoNuevo, contrasena: PW });

    const confirmarPrimero = await ctx.request
      .post('/api/v1/auth/cambio-correo/confirmar')
      .send({ token: tokenPrimero });
    expect(confirmarPrimero.status).toBe(410);
  });
});
