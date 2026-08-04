import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-023 · Registrar Institución Educativa, contra la app real + PostgreSQL real.
const PW = 'correcta-bateria-caballo-grapa';

let ctx: CtxApp;

beforeAll(async () => {
  ctx = await levantarApp();
});

afterAll(async () => {
  await ctx?.detener();
});

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

async function docente(): Promise<{ token: string; email: string; id: string }> {
  const email = `${randomUUID()}@escuela.edu.ar`;
  await ctx.request
    .post('/api/v1/auth/registro')
    .send({ email, contrasena: PW, nombre: 'Ana', apellido: 'Gómez' });
  await ctx.pg.query(`UPDATE users SET email_verified = true WHERE email = $1`, [email]);
  const login = await ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena: PW });
  const r = await ctx.pg.query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [email]);
  return { token: login.body.token as string, email, id: r.rows[0]!.id };
}

function cuitNuevo(): string {
  return `30-${Math.floor(10_000_000 + Math.random() * 89_999_999)}-9`;
}

const DOMICILIO = {
  calle: 'San Martín',
  numero: '450',
  localidad: 'La Plata',
  provincia: 'Buenos Aires',
  codigo_postal: '1900',
};

function cuerpo(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    nombre_legal: 'Escuela Normal N°1',
    identificador_tributario: cuitNuevo(),
    email_institucional: `${randomUUID()}@institucion.edu.ar`,
    domicilio: DOMICILIO,
    ...over,
  };
}

const registrar = (token: string, body: Record<string, unknown>) =>
  ctx.request.post('/api/v1/instituciones').set(bearer(token)).send(body);

describe('CU-023 · Registrar institución educativa', () => {
  it('flujo principal: crea la institución, vincula al encargado y audita', async () => {
    const { token, id: usuarioId } = await docente();
    const res = await registrar(token, cuerpo());

    expect(res.status).toBe(201);
    const institucionId = res.body.institucion_id as string;
    expect(institucionId).toBeTruthy(); // CU-23 p16: devuelve el id

    // p14 / RN-004: queda como encargado principal.
    const vinculo = await ctx.pg.query<{ is_admin: boolean; status: string }>(
      `SELECT is_admin, status FROM institutional_teachers
        WHERE institution_id = $1 AND user_id = $2`,
      [institucionId, usuarioId],
    );
    expect(vinculo.rows[0]?.is_admin).toBe(true);
    expect(vinculo.rows[0]?.status).toBe('active');

    // p15 / RNF-011: el sujeto del evento es la INSTITUCIÓN, y el actor el encargado.
    const evento = await ctx.pg.query<{ entity_type: string; actor_user_id: string }>(
      `SELECT entity_type, actor_user_id FROM audit_log
        WHERE action = 'InstitucionRegistrada' AND entity_id = $1`,
      [institucionId],
    );
    expect(evento.rows[0]?.entity_type).toBe('institution');
    expect(evento.rows[0]?.actor_user_id).toBe(usuarioId);
  });

  it('A11: guarda los tres opcionales y resuelve el nivel contra la tabla `levels`', async () => {
    const { token } = await docente();
    const res = await registrar(
      token,
      cuerpo({ telefono: '221-4567890', nivel_educativo: 'Primaria', cantidad_alumnos: 350 }),
    );
    expect(res.status).toBe(201);

    const fila = await ctx.pg.query<{
      phone: string;
      student_count: number;
      nivel: string;
      street: string;
      city: string;
    }>(
      `SELECT i.phone, i.student_count, l.name AS nivel, i.street, i.city
         FROM institutions i JOIN levels l ON l.id = i.level_id WHERE i.id = $1`,
      [res.body.institucion_id],
    );
    expect(fila.rows[0]?.phone).toBe('221-4567890');
    expect(fila.rows[0]?.student_count).toBe(350);
    expect(fila.rows[0]?.nivel).toBe('Primaria');
    // El domicilio se guarda estructurado, no todo en una columna.
    expect(fila.rows[0]?.street).toBe('San Martín');
    expect(fila.rows[0]?.city).toBe('La Plata');
  });

  it('A1: un usuario ya vinculado no puede registrar otra institución → 409', async () => {
    const { token } = await docente();
    expect((await registrar(token, cuerpo())).status).toBe(201);

    const segunda = await registrar(token, cuerpo());
    expect(segunda.status).toBe(409);
    expect(segunda.body.detail).toMatch(/ya pertenecés/i);
  });

  it('A2: CUIT duplicado → 409, aunque venga escrito con otro formato', async () => {
    const cuit = cuitNuevo();
    expect((await registrar((await docente()).token, cuerpo({ identificador_tributario: cuit })))
      .status).toBe(201);

    // Mismo número sin guiones: RN-001 no se esquiva cambiando el formato.
    const otro = await registrar(
      (await docente()).token,
      cuerpo({ identificador_tributario: cuit.replace(/\D/g, '') }),
    );
    expect(otro.status).toBe(409);
    expect(otro.body.detail).toMatch(/cuit/i);
  });

  it('A3: email institucional duplicado → 409', async () => {
    const email = `${randomUUID()}@institucion.edu.ar`;
    expect((await registrar((await docente()).token, cuerpo({ email_institucional: email })))
      .status).toBe(201);

    const otro = await registrar((await docente()).token, cuerpo({ email_institucional: email }));
    expect(otro.status).toBe(409);
    expect(otro.body.detail).toMatch(/email/i);
  });

  it('A4/A5/A6: validaciones de entrada → 422', async () => {
    const { token } = await docente();
    // A4: obligatorio vacío
    expect((await registrar(token, cuerpo({ nombre_legal: '' }))).status).toBe(422);
    // A5: CUIT sin 11 dígitos
    expect((await registrar(token, cuerpo({ identificador_tributario: '20-123-4' }))).status).toBe(422);
    // A6: email inválido
    expect((await registrar(token, cuerpo({ email_institucional: 'no-es-email' }))).status).toBe(422);
    // Nivel que no existe en `levels`
    expect((await registrar(token, cuerpo({ nivel_educativo: 'Universitario' }))).status).toBe(422);
  });

  it('A9: sin sesión no se puede registrar → 401, y nada queda escrito', async () => {
    const body = cuerpo();
    const res = await ctx.request.post('/api/v1/instituciones').send(body);
    expect(res.status).toBe(401);

    const n = await ctx.pg.query<{ n: string }>(
      `SELECT count(*) AS n FROM institutions WHERE tax_id = $1`,
      [(body.identificador_tributario as string).replace(/\D/g, '')],
    );
    expect(Number(n.rows[0]!.n)).toBe(0);
  });

  it('atomicidad: si el vínculo falla, la institución no queda huérfana', async () => {
    const { token, id } = await docente();
    // Se lo hace encargado de otra institución por fuera, saltando el chequeo del caso de uso.
    const otra = await ctx.pg.query<{ id: string }>(
      `INSERT INTO institutions (legal_name, tax_id, email) VALUES ('Otra', $1, $2) RETURNING id`,
      [cuitNuevo().replace(/\D/g, ''), `${randomUUID()}@x.edu.ar`],
    );
    await ctx.pg.query(
      `INSERT INTO institutional_teachers (institution_id, user_id, invited_email, is_admin, status)
       VALUES ($1, $2, 'x@x.com', true, 'active')`,
      [otra.rows[0]!.id, id],
    );

    const body = cuerpo();
    const res = await registrar(token, body);
    expect(res.status).toBe(409);

    // Rollback total: la institución del intento fallido no existe.
    const n = await ctx.pg.query<{ n: string }>(
      `SELECT count(*) AS n FROM institutions WHERE tax_id = $1`,
      [(body.identificador_tributario as string).replace(/\D/g, '')],
    );
    expect(Number(n.rows[0]!.n)).toBe(0);
  });
});

// GET /instituciones/mine: sin esto el frontend no puede recuperar `institucion_id` fuera del
// instante de POST /instituciones (que lo devuelve una sola vez, al crearla).
describe('GET /instituciones/mine', () => {
  it('devuelve la institución propia y si el usuario es el encargado', async () => {
    const { token } = await docente();
    const body = cuerpo();
    const alta = await registrar(token, body);
    const institucionId = alta.body.institucion_id as string;

    const res = await ctx.request.get('/api/v1/instituciones/mine').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.institucion_id).toBe(institucionId);
    expect(res.body.es_encargado).toBe(true);
  });

  // CU-24 (precarga de checkout institucional): sin esto no hay de dónde precargar la dirección
  // ni los datos de facturación (RN-007) en /institucion/checkout.
  it('devuelve el domicilio y los datos de facturación de la institución registrada', async () => {
    const { token } = await docente();
    const body = cuerpo();
    await registrar(token, body);

    const res = await ctx.request.get('/api/v1/instituciones/mine').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.datos_facturacion_envio.nombre_legal).toBe(body.nombre_legal);
    // `RegistrarInstitucion` normaliza el CUIT a solo dígitos antes de guardarlo.
    expect(res.body.datos_facturacion_envio.identificador_tributario).toBe(
      (body.identificador_tributario as string).replace(/\D/g, ''),
    );
    expect(res.body.datos_facturacion_envio.domicilio).toEqual(DOMICILIO);
  });

  it('un docente sin institución recibe institucion_id: null y sin datos de facturación', async () => {
    const { token } = await docente();
    const res = await ctx.request.get('/api/v1/instituciones/mine').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.institucion_id).toBeNull();
    expect(res.body.es_encargado).toBe(false);
    expect(res.body.datos_facturacion_envio).toBeNull();
  });

  it('un docente vinculado pero sin ser encargado recibe es_encargado=false', async () => {
    const encargado = await docente();
    const alta = await registrar(encargado.token, cuerpo());
    const institucionId = alta.body.institucion_id as string;

    const otro = await docente();
    await ctx.pg.query(
      `INSERT INTO institutional_teachers (institution_id, user_id, invited_email, is_admin, status, joined_at)
       VALUES ($1, $2, $3, false, 'active', now())`,
      [institucionId, otro.id, otro.email],
    );

    const res = await ctx.request.get('/api/v1/instituciones/mine').set(bearer(otro.token));
    expect(res.status).toBe(200);
    expect(res.body.institucion_id).toBe(institucionId);
    expect(res.body.es_encargado).toBe(false);
  });

  it('sin sesión responde 401', async () => {
    const res = await ctx.request.get('/api/v1/instituciones/mine');
    expect(res.status).toBe(401);
  });
});
