import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// Escenarios Gherkin de 1.1-A (registro y login) verificados contra la app REAL + PostgreSQL
// real (Testcontainers). Prohibido mockear la BD (ADR-002 / CLAUDE.md).

const CONTRASENA_OK = 'correcta-bateria-caballo-grapa';

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

function registrar(email: string, contrasena = CONTRASENA_OK) {
  return ctx.request
    .post('/api/v1/auth/registro')
    .send({ email, contrasena, nombre: 'María', apellido: 'Pérez' });
}

function login(email: string, contrasena = CONTRASENA_OK) {
  return ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena });
}

describe('CU-001 · Registrar Docente', () => {
  it('@scenario:AUT-CU001-HAPPY-001 · registro crea cuenta no_verificada, evento y email', async () => {
    const email = emailNuevo();
    const res = await registrar(email);
    expect(res.status).toBe(201);

    const cuenta = await ctx.pg.query(`SELECT estado FROM cuentas WHERE email = $1`, [email]);
    expect(cuenta.rows[0]?.estado).toBe('no_verificada');

    const evento = await ctx.pg.query(
      `SELECT 1 FROM eventos_auditoria WHERE tipo = 'DocenteRegistrado' AND sujeto_id =
         (SELECT id FROM cuentas WHERE email = $1)`,
      [email],
    );
    expect(evento.rows).toHaveLength(1);

    const outbox = await ctx.pg.query(
      `SELECT tipo FROM outbox_emails WHERE destinatario = $1`,
      [email],
    );
    expect(outbox.rows[0]?.tipo).toBe('verificacion_email');
  });

  it('@scenario:AUT-CU001-ALT-001 · email ya existente no revela la cuenta (anti-enumeración)', async () => {
    const email = emailNuevo();
    const primera = await registrar(email);
    const segunda = await registrar(email);

    // Misma respuesta (status idéntico) exista o no la cuenta.
    expect(segunda.status).toBe(primera.status);
    expect(segunda.status).toBe(201);

    // No se crea una segunda cuenta.
    const cuentas = await ctx.pg.query(`SELECT count(*)::int AS n FROM cuentas WHERE email = $1`, [
      email,
    ]);
    expect(cuentas.rows[0]?.n).toBe(1);

    // El segundo intento encola un email "cuenta-existente" en lugar de verificación.
    const tipos = await ctx.pg.query(
      `SELECT tipo FROM outbox_emails WHERE destinatario = $1 ORDER BY creado_en`,
      [email],
    );
    expect(tipos.rows.map((r) => r.tipo)).toEqual(['verificacion_email', 'cuenta-existente']);
  });

  it('@scenario:AUT-CU001-EXC-001 · contraseña filtrada se rechaza con 422 y no crea cuenta', async () => {
    const email = emailNuevo();
    const res = await registrar(email, '123456789012'); // contraseña en la lista de filtradas
    expect(res.status).toBe(422);

    const cuentas = await ctx.pg.query(`SELECT count(*)::int AS n FROM cuentas WHERE email = $1`, [
      email,
    ]);
    expect(cuentas.rows[0]?.n).toBe(0);
  });
});

describe('CU-002 · Iniciar sesión', () => {
  it('@scenario:AUT-CU002-HAPPY-001 · credenciales válidas crean sesión (token + cookie + evento)', async () => {
    const email = emailNuevo();
    await registrar(email);

    const res = await login(email);
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.cuenta.email).toBe(email);

    // Sesión dual: además del token (Bearer/APK), viene la cookie httpOnly (web).
    const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined;
    expect(setCookie?.some((c) => c.startsWith('acalud_sesion='))).toBe(true);
    expect(setCookie?.some((c) => c.toLowerCase().includes('httponly'))).toBe(true);

    const evento = await ctx.pg.query(
      `SELECT 1 FROM eventos_auditoria WHERE tipo = 'SesionIniciada' AND sujeto_id =
         (SELECT id FROM cuentas WHERE email = $1)`,
      [email],
    );
    expect(evento.rows).toHaveLength(1);
  });

  it('@scenario:AUT-CU002-ALT-001 · cuenta no verificada inicia sesión con capacidades limitadas', async () => {
    const email = emailNuevo();
    await registrar(email); // queda no_verificada
    const res = await login(email);
    expect(res.status).toBe(200);
    expect(res.body.capacidades_limitadas).toBe(true);
  });

  it('@scenario:AUT-CU002-EXC-001 · 5 intentos fallidos bloquean la cuenta 15 min', async () => {
    const email = emailNuevo();
    await registrar(email);

    for (let i = 0; i < 4; i++) {
      const r = await login(email, 'password-incorrecta-larga');
      expect(r.status).toBe(401); // credenciales inválidas (mensaje genérico)
    }
    // El 5º fallo bloquea → 423.
    const quinto = await login(email, 'password-incorrecta-larga');
    expect(quinto.status).toBe(423);

    // Un intento posterior, incluso con la contraseña correcta, no evalúa credenciales → 423.
    const conCorrecta = await login(email, CONTRASENA_OK);
    expect(conCorrecta.status).toBe(423);

    const cuenta = await ctx.pg.query(`SELECT bloqueada_hasta FROM cuentas WHERE email = $1`, [
      email,
    ]);
    expect(cuenta.rows[0]?.bloqueada_hasta).not.toBeNull();

    const aviso = await ctx.pg.query(
      `SELECT 1 FROM outbox_emails WHERE destinatario = $1 AND tipo = 'aviso-bloqueo'`,
      [email],
    );
    expect(aviso.rows).toHaveLength(1);
  });
});

describe('Sesión dual (ADR-004) · cookie y Bearer sobre el mismo store', () => {
  it('GET /me funciona con Bearer y con cookie; el logout revoca en ambos canales', async () => {
    const email = emailNuevo();
    await registrar(email);
    const token = (await login(email)).body.token as string;

    // Bearer (APK)
    const conBearer = await ctx.request
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`);
    expect(conBearer.status).toBe(200);
    expect(conBearer.body.email).toBe(email);

    // Cookie (web)
    const conCookie = await ctx.request
      .get('/api/v1/me')
      .set('Cookie', `acalud_sesion=${token}`);
    expect(conCookie.status).toBe(200);

    // Logout invalida server-side.
    const logout = await ctx.request
      .delete('/api/v1/auth/sesion')
      .set('Authorization', `Bearer ${token}`);
    expect(logout.status).toBe(204);

    // La revocación afecta a ambos canales.
    expect((await ctx.request.get('/api/v1/me').set('Authorization', `Bearer ${token}`)).status).toBe(
      401,
    );
    expect((await ctx.request.get('/api/v1/me').set('Cookie', `acalud_sesion=${token}`)).status).toBe(
      401,
    );
  });

  it('GET /me sin credenciales responde 401 con Problem Details', async () => {
    const res = await ctx.request.get('/api/v1/me');
    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(typeof res.body.trace_id).toBe('string');
  });
});
