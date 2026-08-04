import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-31 · Ver reporte de uso institucional (KPIs, serie temporal, nube de palabras).
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
  await ctx.request.post('/api/v1/auth/registro').send({ email, contrasena: PW, nombre: nombrePila, apellido });
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

async function inventario(institucionId: string, productoId: string, adquirida: number): Promise<void> {
  await ctx.pg.query(
    `INSERT INTO institutional_inventories (institution_id, product_id, quantity_purchased, quantity_assigned)
     VALUES ($1, $2, $3, 0)`,
    [institucionId, productoId, adquirida],
  );
}

async function docenteVinculado(
  institucionId: string,
  nombre: string,
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
  ctx.request.post('/api/v1/docentes/me/sesiones-juego').set(bearer(token)).send(body);

const verReporte = (token: string, institucionId: string, qs = '') =>
  ctx.request.get(`/api/v1/instituciones/${institucionId}/reportes/uso${qs}`).set(bearer(token));

async function encargadoTeacherIdDe(usuarioId: string): Promise<string> {
  const r = await ctx.pg.query<{ id: string }>(`SELECT id FROM institutional_teachers WHERE user_id = $1`, [
    usuarioId,
  ]);
  return r.rows[0]!.id;
}

describe('CU-31 · Reporte de uso institucional', () => {
  it('401 sin sesión, 404 si el usuario no es encargado', async () => {
    const encargado = await docente('Directora Marta');
    const institucionId = await institucionDe(encargado.token);

    const sinToken = await ctx.request.get(`/api/v1/instituciones/${institucionId}/reportes/uso`);
    expect(sinToken.status).toBe(401);

    const otro = await docente('Docente Ajeno');
    const ajeno = await verReporte(otro.token, institucionId);
    expect(ajeno.status).toBe(404);
  });

  it('institución sin sesiones: KPIs en 0, listas vacías', async () => {
    const encargado = await docente('Director Sin Datos');
    const institucionId = await institucionDe(encargado.token);

    const r = await verReporte(encargado.token, institucionId);
    expect(r.status).toBe(200);
    expect(r.body.datos).toEqual([]);
    expect(r.body.kpis).toEqual({
      total_sesiones: 0,
      alumnos_alcanzados: 0,
      satisfaccion_promedio: 0,
      juegos_en_uso: 0,
    });
    expect(r.body.serie_temporal).toEqual([]);
    expect(r.body.nube_palabras).toEqual([]);
  });

  it('agrega satisfacción/KPIs/serie/nube y respeta los filtros de juego, docente y fecha', async () => {
    const encargado = await docente('Director Con Datos');
    const institucionId = await institucionDe(encargado.token);
    const encargadoTeacherId = await encargadoTeacherIdDe(encargado.id);

    const juegoA = await producto('Oca Histórica');
    const juegoB = await producto('Memoria Científica');
    await inventario(institucionId, juegoA, 10);
    await inventario(institucionId, juegoB, 10);

    const profeUno = await docenteVinculado(institucionId, 'Laura Profesora');
    const profeDos = await docenteVinculado(institucionId, 'Carlos Docente');
    await asignarLicencia(institucionId, juegoA, profeUno.teacherId, encargadoTeacherId);
    await asignarLicencia(institucionId, juegoB, profeDos.teacherId, encargadoTeacherId);

    const hoy = new Date().toISOString().slice(0, 10);

    // Dos sesiones del juego A por profeUno: satisfacción 4 y 2 → promedio 3.
    await cargarSesion(profeUno.token, {
      producto_id: juegoA,
      fecha_uso: hoy,
      grupo: '4°B',
      cantidad_estudiantes: 20,
      duracion_minutos: 40,
      satisfaccion_docente: 4,
      aprendizajes_clave: 'Trabajo en equipo y resolución de conflictos entre pares.',
      reutilizaria: true,
    });
    await cargarSesion(profeUno.token, {
      producto_id: juegoA,
      fecha_uso: hoy,
      grupo: '5°A',
      cantidad_estudiantes: 15,
      duracion_minutos: 30,
      satisfaccion_docente: 2,
      aprendizajes_clave: 'El trabajo en equipo mejoró mucho la comunicación del grupo.',
      reutilizaria: false,
    });

    // Una sesión del juego B por profeDos: satisfacción 5.
    await cargarSesion(profeDos.token, {
      producto_id: juegoB,
      fecha_uso: hoy,
      grupo: '6°C',
      cantidad_estudiantes: 25,
      duracion_minutos: 45,
      satisfaccion_docente: 5,
      aprendizajes_clave: 'Reforzaron conceptos de biología celular con mucho entusiasmo.',
      reutilizaria: true,
    });

    // Sin filtro: KPIs globales.
    const total = await verReporte(encargado.token, institucionId);
    expect(total.status).toBe(200);
    expect(total.body.kpis).toEqual({
      total_sesiones: 3,
      alumnos_alcanzados: 60,
      satisfaccion_promedio: 3.67,
      juegos_en_uso: 2,
    });
    expect(total.body.serie_temporal.reduce((acc: number, s: { sesiones: number }) => acc + s.sesiones, 0)).toBe(3);
    const palabraTrabajo = total.body.nube_palabras.find((p: { palabra: string }) => p.palabra === 'trabajo');
    expect(palabraTrabajo?.frecuencia).toBe(2);

    // corte=juego: satisfacción promedio de juegoA = (4+2)/2 = 3.
    const porJuego = await verReporte(encargado.token, institucionId, '?corte=juego');
    const filaJuegoA = porJuego.body.datos.find((f: { producto_id: string }) => f.producto_id === juegoA);
    expect(filaJuegoA.total_sesiones).toBe(2);
    expect(filaJuegoA.satisfaccion_promedio).toBe(3);

    // corte=docente.
    const porDocente = await verReporte(encargado.token, institucionId, '?corte=docente');
    const filaProfeUno = porDocente.body.datos.find((f: { docente_id: string }) => f.docente_id === profeUno.id);
    expect(filaProfeUno.total_sesiones).toBe(2);
    expect(filaProfeUno.juegos_distintos).toBe(1);

    // Filtro por producto_id: solo juego B.
    const filtroProducto = await verReporte(encargado.token, institucionId, `?corte=juego&producto_id=${juegoB}`);
    expect(filtroProducto.body.datos).toHaveLength(1);
    expect(filtroProducto.body.kpis.total_sesiones).toBe(1);

    // Filtro por docente_id: solo profeDos.
    const filtroDocente = await verReporte(encargado.token, institucionId, `?corte=juego&docente_id=${profeDos.id}`);
    expect(filtroDocente.body.kpis.total_sesiones).toBe(1);
    expect(filtroDocente.body.kpis.alumnos_alcanzados).toBe(25);

    // Filtro por fecha fuera de rango: sin resultados.
    const fueraDeRango = await verReporte(encargado.token, institucionId, '?desde=2000-01-01&hasta=2000-01-31');
    expect(fueraDeRango.body.kpis.total_sesiones).toBe(0);
  });
});
