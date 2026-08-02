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

    const cuenta = await ctx.pg.query(`SELECT email_verified FROM users WHERE email = $1`, [email]);
    expect(cuenta.rows[0]?.email_verified).toBe(false);

    const evento = await ctx.pg.query(
      `SELECT 1 FROM audit_log WHERE action = 'DocenteRegistrado' AND entity_id =
         (SELECT id FROM users WHERE email = $1)`,
      [email],
    );
    expect(evento.rows).toHaveLength(1);

    const outbox = await ctx.pg.query(
      `SELECT template FROM outbox_emails WHERE recipient = $1`,
      [email],
    );
    expect(outbox.rows[0]?.template).toBe('verificacion_email');
  });

  it('@scenario:AUT-CU001-ALT-001 · email ya existente no revela la cuenta (anti-enumeración)', async () => {
    const email = emailNuevo();
    const primera = await registrar(email);
    const segunda = await registrar(email);

    // Misma respuesta (status idéntico) exista o no la cuenta.
    expect(segunda.status).toBe(primera.status);
    expect(segunda.status).toBe(201);

    // No se crea una segunda cuenta.
    const cuentas = await ctx.pg.query(`SELECT count(*)::int AS n FROM users WHERE email = $1`, [
      email,
    ]);
    expect(cuentas.rows[0]?.n).toBe(1);

    // El segundo intento encola un email "cuenta-existente" en lugar de verificación.
    const tipos = await ctx.pg.query(
      `SELECT template FROM outbox_emails WHERE recipient = $1 ORDER BY created_at`,
      [email],
    );
    expect(tipos.rows.map((r) => r.template)).toEqual(['verificacion_email', 'cuenta-existente']);
  });

  it('@scenario:AUT-CU001-EXC-001 · contraseña filtrada se rechaza con 422 y no crea cuenta', async () => {
    const email = emailNuevo();
    const res = await registrar(email, '123456789012'); // contraseña en la lista de filtradas
    expect(res.status).toBe(422);

    const cuentas = await ctx.pg.query(`SELECT count(*)::int AS n FROM users WHERE email = $1`, [
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
      `SELECT 1 FROM audit_log WHERE action = 'SesionIniciada' AND entity_id =
         (SELECT id FROM users WHERE email = $1)`,
      [email],
    );
    expect(evento.rows).toHaveLength(1);

    // CU-02 RN-003: el último acceso se registra en cada inicio de sesión exitoso.
    const ultimo = await ctx.pg.query<{ last_login: Date | null }>(
      `SELECT last_login FROM users WHERE email = $1`,
      [email],
    );
    expect(ultimo.rows[0]?.last_login).not.toBeNull();
  });

  it('@scenario:AUT-CU002-ALT-001 · cuenta no verificada inicia sesión con capacidades limitadas', async () => {
    const email = emailNuevo();
    await registrar(email); // queda no_verificada
    const res = await login(email);
    expect(res.status).toBe(200);
    expect(res.body.capacidades_limitadas).toBe(true);
  });

  it('@scenario:AUT-CU002-EXC-001 · 3 intentos fallidos bloquean el ingreso 15 min (CU-02 A2.6/A3)', async () => {
    const email = emailNuevo();
    await registrar(email);

    // Los dos primeros fallos responden credenciales inválidas (mensaje genérico).
    for (let i = 0; i < 2; i++) {
      const r = await login(email, 'password-incorrecta-larga');
      expect(r.status).toBe(401);
    }
    // El 3º fallo alcanza el umbral y bloquea → 423.
    const tercero = await login(email, 'password-incorrecta-larga');
    expect(tercero.status).toBe(423);

    // Un intento posterior, incluso con la contraseña correcta, no evalúa credenciales → 423.
    const conCorrecta = await login(email, CONTRASENA_OK);
    expect(conCorrecta.status).toBe(423);

    // El bloqueo se sostiene en el registro de intentos (Δ3), no en una columna de la cuenta.
    const fallos = await ctx.pg.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM login_attempts
        WHERE lower(email) = lower($1) AND result = 'failed'`,
      [email],
    );
    expect(fallos.rows[0]?.n).toBe(3);

    const aviso = await ctx.pg.query(
      `SELECT 1 FROM outbox_emails WHERE recipient = $1 AND template = 'aviso-bloqueo'`,
      [email],
    );
    expect(aviso.rows).toHaveLength(1);
  });
});

describe('CU-004 · Actualizar perfil', () => {
  it('@scenario:AUT-CU004-HAPPY-001 · actualizar perfil crea/actualiza el profile docente y el nombre completo', async () => {
    const email = emailNuevo();
    await registrar(email);
    const token = (await login(email)).body.token as string;

    const res = await ctx.request
      .put('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'María',
        apellido: 'Pérez',
        nivel_educativo: 'Primaria',
        materia: 'Matemática',
        institucion: 'Escuela San Martín',
      });

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('María');
    expect(res.body.apellido).toBe('Pérez');
    expect(res.body.institucion).toBe('Escuela San Martín');

    const perfilLeido = await ctx.request
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`);
    expect(perfilLeido.status).toBe(200);
    expect(perfilLeido.body.nivel_educativo).toBe('Primaria');
    expect(perfilLeido.body.materia).toBe('Matemática');
    expect(perfilLeido.body.institucion).toBe('Escuela San Martín');

    const perfil = await ctx.pg.query<{ school_name: string | null }>(
      `SELECT school_name FROM teacher_profiles tp
         JOIN users u ON u.id = tp.user_id
        WHERE lower(u.email) = lower($1)`,
      [email],
    );
    expect(perfil.rows[0]?.school_name).toBe('Escuela San Martín');
  });
});

describe('CU-023 · Registrar institución', () => {
  it('@scenario:AUT-CU023-HAPPY-001 · registra la institución y crea la membresía de encargado', async () => {
    const email = emailNuevo();
    await registrar(email);
    const token = (await login(email)).body.token as string;

    const res = await ctx.request
      .post('/api/v1/instituciones')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre_legal: 'Escuela San Martín',
        identificador_tributario: '30-71234567-8',
        email_institucional: 'institucional@sanmartin.edu.ar',
        domicilio: {
          calle: 'Av. Siempre Viva',
          numero: '123',
          localidad: 'La Plata',
          provincia: 'Buenos Aires',
          codigo_postal: '1900',
        },
      });

    expect(res.status).toBe(201);

    const institution = await ctx.pg.query<{ id: string; legal_name: string; tax_id: string; email: string }>(
      `SELECT id, legal_name, tax_id, email FROM institutions WHERE lower(email) = lower($1)`,
      ['institucional@sanmartin.edu.ar'],
    );
    expect(institution.rows[0]?.legal_name).toBe('Escuela San Martín');
    // RN-001: el CUIT se persiste normalizado a dígitos, sin guiones.
    expect(institution.rows[0]?.tax_id).toBe('30712345678');

    const membership = await ctx.pg.query<{ is_admin: boolean }>(
      `SELECT is_admin FROM institutional_teachers it
         JOIN users u ON u.id = it.user_id
        WHERE lower(u.email) = lower($1)`,
      [email],
    );
    expect(membership.rows[0]?.is_admin).toBe(true);
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
