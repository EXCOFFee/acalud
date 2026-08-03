import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-029 · Cargar sesión de uso y CU-030 · Ver mis sesiones cargadas
const PW = 'correcta-bateria-caballo-grapa';

let ctx: CtxApp;

beforeAll(async () => {
  ctx = await levantarApp();
});

afterAll(async () => {
  await ctx?.detener();
});

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

async function docente(nombre = 'Ana Gómez'): Promise<{ token: string; email: string; id: string }> {
  const email = `${randomUUID()}@escuela.edu.ar`;
  const [nombrePila, apellido] = nombre.split(' ');
  await ctx.request
    .post('/api/v1/auth/registro')
    .send({ email, contrasena: PW, nombre: nombrePila, apellido });
  await ctx.pg.query(`UPDATE users SET email_verified = true WHERE email = $1`, [email]);
  const login = await ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena: PW });
  const r = await ctx.pg.query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [email]);
  return { token: login.body.token as string, email, id: r.rows[0]!.id };
}

async function institucionDe(token: string): Promise<string> {
  const res = await ctx.request
    .post('/api/v1/instituciones')
    .set(bearer(token))
    .send({
      nombre_legal: 'Escuela Normal N°1',
      identificador_tributario: `30-${Math.floor(10_000_000 + Math.random() * 89_999_999)}-9`,
      email_institucional: `${randomUUID()}@institucion.edu.ar`,
      domicilio: {
        calle: 'San Martín',
        numero: '450',
        localidad: 'La Plata',
        provincia: 'Buenos Aires',
        codigo_postal: '1900',
      },
    });
  expect(res.status).toBe(201);
  return res.body.institucion_id as string;
}

async function producto(nombre: string): Promise<string> {
  const r = await ctx.pg.query<{ id: string }>(
    `INSERT INTO products (name, price, weight_grams, stock, is_active)
     VALUES ($1, 1000, 500, 100, true) RETURNING id`,
    [nombre],
  );
  return r.rows[0]!.id;
}

async function inventario(
  institucionId: string,
  productoId: string,
  adquirida: number,
  asignada = 0,
): Promise<void> {
  await ctx.pg.query(
    `INSERT INTO institutional_inventories (institution_id, product_id, quantity_purchased, quantity_assigned)
     VALUES ($1, $2, $3, $4)`,
    [institucionId, productoId, adquirida, asignada],
  );
}

/** Vincula un docente nuevo (no admin) y activo a la institución. */
async function docenteVinculado(
  institucionId: string,
  nombre = 'Laura Profesora',
): Promise<{ token: string; email: string; id: string; teacherId: string }> {
  const d = await docente(nombre);
  const r = await ctx.pg.query<{ id: string }>(
    `INSERT INTO institutional_teachers (institution_id, user_id, invited_email, is_admin, status, joined_at)
     VALUES ($1, $2, $3, false, 'active', now()) RETURNING id`,
    [institucionId, d.id, d.email],
  );
  return { ...d, teacherId: r.rows[0]!.id };
}

async function asignarLicencia(
  institucionId: string,
  productoId: string,
  teacherId: string,
  encargadoTeacherId: string,
): Promise<void> {
  await ctx.pg.query(
    `INSERT INTO institutional_assignments (institution_id, product_id, institutional_teacher_id, quantity_assigned, status, assigned_by)
     VALUES ($1, $2, $3, 1, 'active', $4)`,
    [institucionId, productoId, teacherId, encargadoTeacherId],
  );
}

const cargarSesion = (token: string, body: Record<string, unknown>) =>
  ctx.request
    .post('/api/v1/docentes/me/sesiones-juego')
    .set(bearer(token))
    .send(body);

const listarSesiones = (token: string) =>
  ctx.request.get('/api/v1/docentes/me/sesiones-juego').set(bearer(token));

const misAsignaciones = (token: string) =>
  ctx.request.get('/api/v1/docentes/me/asignaciones').set(bearer(token));

const detalleSesion = (token: string, id: string) =>
  ctx.request.get(`/api/v1/docentes/me/sesiones-juego/${id}`).set(bearer(token));

describe('CU-029 y CU-030 · Sesiones de Juego', () => {
  it('INS-CU029-HAPPY-001: Carga válida sobre un juego del catálogo institucional y su listado', async () => {
    const encargado = await docente('Director Juan');
    const institucionId = await institucionDe(encargado.token);
    
    // Conseguir ID del teacher encargado
    const rEncargado = await ctx.pg.query<{ id: string }>(
      `SELECT id FROM institutional_teachers WHERE user_id = $1`,
      [encargado.id]
    );
    const encargadoTeacherId = rEncargado.rows[0]!.id;

    const productoId = await producto('Juego Fracciones');
    await inventario(institucionId, productoId, 10, 1);

    const profe = await docenteVinculado(institucionId, 'Laura Profe');
    await asignarLicencia(institucionId, productoId, profe.teacherId, encargadoTeacherId);

    // Cargar sesión CU-029
    const res = await cargarSesion(profe.token, {
      producto_id: productoId,
      fecha_uso: new Date().toISOString(),
      grupo: '4°B',
      cantidad_estudiantes: 28,
      duracion_minutos: 45,
      satisfaccion_docente: 5,
      aprendizajes_clave: 'Aprendimos a sumar fracciones con distinto denominador.',
      reutilizaria: true
    });

    expect(res.status).toBe(201);

    // Auditoría
    const auditoria = await ctx.pg.query<{ action: string; actor_user_id: string }>(
      `SELECT action, actor_user_id FROM audit_log
        WHERE entity_type = 'session' AND actor_user_id = $1`,
      [profe.id],
    );
    expect(auditoria.rows[0]?.action).toBe('game_session_registered');

    // CU-030: Ver listado
    const lista = await listarSesiones(profe.token);
    expect(lista.status).toBe(200);
    expect(lista.body.items).toHaveLength(1);
    expect(lista.body.items[0].estudiantes).toBe(28);
    expect(lista.body.items[0].grupo).toBe('4°B');
    expect(lista.body.items[0].productoId).toBe(productoId);
    expect(lista.body.items[0].nombreProducto).toBe('Juego Fracciones');

    // CU-030 A9: detalle completo de esa sesión
    const sesionId = lista.body.items[0].id as string;
    const detalle = await detalleSesion(profe.token, sesionId);
    expect(detalle.status).toBe(200);
    expect(detalle.body.nombreProducto).toBe('Juego Fracciones');
    expect(detalle.body.aprendizajes).toBe('Aprendimos a sumar fracciones con distinto denominador.');
    expect(detalle.body.reutilizaria).toBe(true);
    expect(detalle.body.dificultades).toBeNull();
    expect(detalle.body.registradaEn).toBeTruthy();
  });

  it('INS-CU030-EXC-001: detalle de una sesión ajena o inexistente → 404', async () => {
    const encargado = await docente('Director Roberto');
    const institucionId = await institucionDe(encargado.token);
    const rEncargado = await ctx.pg.query<{ id: string }>(
      `SELECT id FROM institutional_teachers WHERE user_id = $1`,
      [encargado.id],
    );
    const productoId = await producto('Juego Historia');
    await inventario(institucionId, productoId, 5, 1);
    const profeA = await docenteVinculado(institucionId, 'Profe A');
    const profeB = await docenteVinculado(institucionId, 'Profe B');
    await asignarLicencia(institucionId, productoId, profeA.teacherId, rEncargado.rows[0]!.id);

    const res = await cargarSesion(profeA.token, {
      producto_id: productoId,
      fecha_uso: new Date().toISOString(),
      grupo: '2°A',
      cantidad_estudiantes: 15,
      duracion_minutos: 20,
      satisfaccion_docente: 3,
      aprendizajes_clave: 'Línea de tiempo de próceres argentinos del siglo XIX.',
      reutilizaria: false,
    });
    const sesionId = res.body.sessionId as string;

    // profeB intenta ver el detalle de la sesión de profeA → ajena, 404
    const ajena = await detalleSesion(profeB.token, sesionId);
    expect(ajena.status).toBe(404);

    // ID inexistente → también 404
    const inexistente = await detalleSesion(profeA.token, randomUUID());
    expect(inexistente.status).toBe(404);
  });

  it('INS-CU029-EXC-001: Juego no adquirido (o no asignado) por la institución es rechazado', async () => {
    const encargado = await docente('Director Juan');
    const institucionId = await institucionDe(encargado.token);
    const productoId = await producto('Juego Geometría');
    
    // El juego no se inventaría ni asigna
    const profe = await docenteVinculado(institucionId, 'Carlos Profe');

    const res = await cargarSesion(profe.token, {
      producto_id: productoId,
      fecha_uso: new Date().toISOString(),
      grupo: '5°A',
      cantidad_estudiantes: 25,
      duracion_minutos: 45,
      satisfaccion_docente: 4,
      aprendizajes_clave: 'Figuras geométricas en el plano cartesiano.',
      reutilizaria: false
    });

    // Como no está asignado, esperamos un 403 (JuegoNoAsignado mapped to 403)
    expect(res.status).toBe(403);
    expect(res.body.title).toBe('No encontrado'); // Wait, mapped error in docentes.controller is 'No encontrado', 403
  });
});

describe('CU-029 paso 2 / CU-030 · GET /docentes/me/asignaciones', () => {
  it('INS-CU029-ASIG-001: lista los juegos asignados al docente con su conteo de sesiones', async () => {
    const encargado = await docente('Directora Marta');
    const institucionId = await institucionDe(encargado.token);
    const rEncargado = await ctx.pg.query<{ id: string }>(
      `SELECT id FROM institutional_teachers WHERE user_id = $1`,
      [encargado.id],
    );
    const encargadoTeacherId = rEncargado.rows[0]!.id;

    const productoId = await producto('Juego Ajedrez');
    await inventario(institucionId, productoId, 5, 1);
    const profe = await docenteVinculado(institucionId, 'Pedro Profe');
    await asignarLicencia(institucionId, productoId, profe.teacherId, encargadoTeacherId);

    // Sin sesiones cargadas todavía.
    const antes = await misAsignaciones(profe.token);
    expect(antes.status).toBe(200);
    expect(antes.body.juegos).toHaveLength(1);
    expect(antes.body.juegos[0].producto_id).toBe(productoId);
    expect(antes.body.juegos[0].cantidad).toBe(1);
    expect(antes.body.juegos[0].total_sesiones).toBe(0);
    expect(antes.body.juegos[0].ultima_sesion_en).toBeNull();

    // Tras cargar una sesión, el conteo se refleja.
    await cargarSesion(profe.token, {
      producto_id: productoId,
      fecha_uso: new Date().toISOString(),
      grupo: '3°A',
      cantidad_estudiantes: 20,
      duracion_minutos: 30,
      satisfaccion_docente: 4,
      aprendizajes_clave: 'Estrategias básicas de apertura en ajedrez escolar.',
      reutilizaria: true,
    });

    const despues = await misAsignaciones(profe.token);
    expect(despues.body.juegos[0].total_sesiones).toBe(1);
    expect(despues.body.juegos[0].ultima_sesion_en).not.toBeNull();
  });

  it('INS-CU029-ASIG-002: docente sin vinculación institucional recibe lista vacía (no error)', async () => {
    const suelto = await docente('Docente Suelto');
    const res = await misAsignaciones(suelto.token);
    expect(res.status).toBe(200);
    expect(res.body.juegos).toEqual([]);
  });

  it('INS-CU029-ASIG-003: sin sesión → 401', async () => {
    const res = await ctx.request.get('/api/v1/docentes/me/asignaciones');
    expect(res.status).toBe(401);
  });
});
