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
    expect(lista.body.datos).toHaveLength(1);
    expect(lista.body.datos[0].producto_id).toBe(productoId);
    expect(lista.body.datos[0].cantidad_estudiantes).toBe(28);
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
