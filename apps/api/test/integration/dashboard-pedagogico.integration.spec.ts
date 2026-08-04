import { randomUUID } from 'node:crypto';
import ExcelJS from 'exceljs';
import pdfParse from 'pdf-parse';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-33 · Ver dashboard de métricas pedagógicas + exportarlo (A9).
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

const verDashboard = (token: string, institucionId: string, qs = '') =>
  ctx.request.get(`/api/v1/instituciones/${institucionId}/dashboard${qs}`).set(bearer(token));

// El xlsx/pdf no tienen parser registrado en superagent: hay que bufferear la respuesta binaria
// completa en `res.body` (mismo patrón que en reportes-institucionales.integration.spec.ts).
const exportarDashboard = (token: string, institucionId: string, qs = '') =>
  ctx.request
    .get(`/api/v1/instituciones/${institucionId}/dashboard/exportar${qs}`)
    .set(bearer(token))
    .buffer(true)
    .parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => cb(null, Buffer.concat(chunks)));
    });

async function encargadoTeacherIdDe(usuarioId: string): Promise<string> {
  const r = await ctx.pg.query<{ id: string }>(`SELECT id FROM institutional_teachers WHERE user_id = $1`, [
    usuarioId,
  ]);
  return r.rows[0]!.id;
}

describe('CU-33 · Dashboard de métricas pedagógicas', () => {
  it('401 sin sesión, 404 si el usuario no es encargado', async () => {
    const encargado = await docente('Directora Dashboard');
    const institucionId = await institucionDe(encargado.token);

    const sinToken = await ctx.request.get(`/api/v1/instituciones/${institucionId}/dashboard`);
    expect(sinToken.status).toBe(401);

    const otro = await docente('Docente Ajeno Dashboard');
    expect((await verDashboard(otro.token, institucionId)).status).toBe(404);
  });

  it('institución sin sesiones: KPIs en 0, listas vacías', async () => {
    const encargado = await docente('Director Dashboard Sin Datos');
    const institucionId = await institucionDe(encargado.token);

    const r = await verDashboard(encargado.token, institucionId);
    expect(r.status).toBe(200);
    expect(r.body.kpis.sesiones.valor).toBe(0);
    expect(r.body.kpis.satisfaccion_promedio.valor).toBe(0);
    expect(r.body.kpis.tasa_reutilizacion.valor).toBe(0);
    expect(r.body.top_juegos).toEqual([]);
    expect(r.body.top_docentes).toEqual([]);
    expect(r.body.nube_palabras).toEqual([]);
    expect(r.body.dificultades_frecuentes).toEqual([]);
    expect(r.body.distribucion_dia_semana).toHaveLength(7);
    expect(r.body.distribucion_satisfaccion).toHaveLength(5);
  });

  it('KPIs, distribuciones, top 5 con tasa de reutilización y filtro combinado (A5)', async () => {
    const encargado = await docente('Director Dashboard Con Datos');
    const institucionId = await institucionDe(encargado.token);
    const encargadoTeacherId = await encargadoTeacherIdDe(encargado.id);

    const juegoA = await producto('Rally Matemático');
    const juegoB = await producto('Atlas Interactivo');
    await inventario(institucionId, juegoA, 10);
    await inventario(institucionId, juegoB, 10);

    const profeUno = await docenteVinculado(institucionId, 'Elena Profesora');
    const profeDos = await docenteVinculado(institucionId, 'Ramiro Docente');
    await asignarLicencia(institucionId, juegoA, profeUno.teacherId, encargadoTeacherId);
    await asignarLicencia(institucionId, juegoB, profeDos.teacherId, encargadoTeacherId);

    const hoy = new Date().toISOString().slice(0, 10);

    // Dos sesiones del juego A por profeUno: satisfacción 4 y 2, would_reuse true/false.
    await cargarSesion(profeUno.token, {
      producto_id: juegoA,
      fecha_uso: hoy,
      grupo: '4°B',
      cantidad_estudiantes: 20,
      duracion_minutos: 40,
      satisfaccion_docente: 4,
      aprendizajes_clave: 'Trabajo colaborativo y razonamiento lógico matemático.',
      dificultades: 'Falta de tiempo para completar todas las rondas del juego.',
      reutilizaria: true,
    });
    await cargarSesion(profeUno.token, {
      producto_id: juegoA,
      fecha_uso: hoy,
      grupo: '5°A',
      cantidad_estudiantes: 15,
      duracion_minutos: 30,
      satisfaccion_docente: 2,
      aprendizajes_clave: 'El trabajo colaborativo mejoró mucho hacia el final.',
      dificultades: 'Falta de espacio físico en el aula para jugar en grupos.',
      reutilizaria: false,
    });

    // Una sesión del juego B por profeDos.
    await cargarSesion(profeDos.token, {
      producto_id: juegoB,
      fecha_uso: hoy,
      grupo: '6°C',
      cantidad_estudiantes: 25,
      duracion_minutos: 45,
      satisfaccion_docente: 5,
      aprendizajes_clave: 'Ubicación geográfica y trabajo en equipo con mapas.',
      reutilizaria: true,
    });

    const total = await verDashboard(encargado.token, institucionId, '?desde=2000-01-01');
    expect(total.status).toBe(200);
    expect(total.body.kpis.sesiones.valor).toBe(3);
    expect(total.body.kpis.alumnos_alcanzados.valor).toBe(60);
    expect(total.body.kpis.satisfaccion_promedio.valor).toBe(3.67);
    expect(total.body.kpis.tasa_reutilizacion.valor).toBe(67); // 2 de 3 con would_reuse=true

    // Top juegos: juegoA con 2 sesiones, tasa de reutilización 50% (1 de 2).
    const filaJuegoA = total.body.top_juegos.find((f: { producto_id: string }) => f.producto_id === juegoA);
    expect(filaJuegoA.total_sesiones).toBe(2);
    expect(filaJuegoA.tasa_reutilizacion).toBe(50);

    // Distribución de satisfacción: una sesión con 4, una con 2, una con 5.
    const distribucion = total.body.distribucion_satisfaccion;
    expect(distribucion.find((d: { estrellas: number }) => d.estrellas === 4).cantidad).toBe(1);
    expect(distribucion.find((d: { estrellas: number }) => d.estrellas === 2).cantidad).toBe(1);
    expect(distribucion.find((d: { estrellas: number }) => d.estrellas === 5).cantidad).toBe(1);
    expect(distribucion.find((d: { estrellas: number }) => d.estrellas === 1).cantidad).toBe(0);

    // Estacionalidad: suma de sesiones por día de semana = total.
    const sumaDias = total.body.distribucion_dia_semana.reduce((acc: number, d: { sesiones: number }) => acc + d.sesiones, 0);
    expect(sumaDias).toBe(3);

    // Serie mensual: incluye satisfacción promedio.
    const mesActual = total.body.serie_mensual[total.body.serie_mensual.length - 1];
    expect(mesActual.sesiones).toBeGreaterThan(0);
    expect(typeof mesActual.satisfaccion_promedio).toBe('number');

    // Nube de palabras y dificultades frecuentes.
    const colaborativo = total.body.nube_palabras.find((p: { palabra: string }) => p.palabra === 'colaborativo');
    expect(colaborativo?.frecuencia).toBe(2);
    const falta = total.body.dificultades_frecuentes.find((p: { palabra: string }) => p.palabra === 'falta');
    expect(falta?.frecuencia).toBe(2);

    // A5: filtro combinado (juego + docente) — solo la sesión de juegoA por profeUno con más alumnos.
    const filtrado = await verDashboard(
      encargado.token,
      institucionId,
      `?desde=2000-01-01&producto_id=${juegoA}&docente_id=${profeUno.id}`,
    );
    expect(filtrado.body.kpis.sesiones.valor).toBe(2);
    expect(filtrado.body.top_juegos).toHaveLength(1);
    expect(filtrado.body.top_juegos[0].producto_id).toBe(juegoA);

    // Filtro que no matchea ningún dato de este período: sesiones en 0.
    const filtradoDocenteAjeno = await verDashboard(
      encargado.token,
      institucionId,
      `?desde=2000-01-01&producto_id=${juegoB}&docente_id=${profeUno.id}`,
    );
    expect(filtradoDocenteAjeno.body.kpis.sesiones.valor).toBe(0);
  });
});

describe('CU-33 A9 · Exportar el dashboard pedagógico', () => {
  it('401 sin sesión, 404 si no es encargado', async () => {
    const encargado = await docente('Directora Export Dashboard');
    const institucionId = await institucionDe(encargado.token);

    const sinToken = await ctx.request.get(`/api/v1/instituciones/${institucionId}/dashboard/exportar`);
    expect(sinToken.status).toBe(401);

    const otro = await docente('Docente Ajeno Export Dashboard');
    expect((await exportarDashboard(otro.token, institucionId)).status).toBe(404);
  });

  it('genera un .xlsx con las 5 hojas del dashboard (aun sin sesiones)', async () => {
    const encargado = await docente('Director Export Dashboard Excel');
    const institucionId = await institucionDe(encargado.token);

    const r = await exportarDashboard(encargado.token, institucionId);
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(r.headers['content-disposition']).toMatch(/^attachment; filename="Dashboard_Pedagogico_.+\.xlsx"$/);

    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(r.body as Buffer);
    expect(libro.worksheets.map((h) => h.name)).toEqual([
      'Resumen',
      'Juegos',
      'Docentes',
      'Aprendizajes',
      'Dificultades',
    ]);
  });

  it('genera un PDF válido con los KPIs del dashboard', async () => {
    const encargado = await docente('Director Export Dashboard PDF');
    const institucionId = await institucionDe(encargado.token);
    const encargadoTeacherId = await encargadoTeacherIdDe(encargado.id);

    const juego = await producto('Juego Export Dashboard');
    await inventario(institucionId, juego, 10);
    const profe = await docenteVinculado(institucionId, 'Tomás Profesor');
    await asignarLicencia(institucionId, juego, profe.teacherId, encargadoTeacherId);

    await cargarSesion(profe.token, {
      producto_id: juego,
      fecha_uso: new Date().toISOString().slice(0, 10),
      grupo: '3°C',
      cantidad_estudiantes: 12,
      duracion_minutos: 40,
      satisfaccion_docente: 5,
      aprendizajes_clave: 'Comunicación efectiva y trabajo en equipo colaborativo.',
      reutilizaria: true,
    });

    const r = await exportarDashboard(encargado.token, institucionId, '?formato=pdf&desde=2000-01-01');
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toBe('application/pdf');
    expect(r.headers['content-disposition']).toMatch(/^attachment; filename="Dashboard_Pedagogico_.+\.pdf"$/);

    const buffer = r.body as Buffer;
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    const { text } = await pdfParse(buffer);
    expect(text).toContain('Total de sesiones: 1');
    expect(text).toContain('Dashboard pedagógico');
  });
});
