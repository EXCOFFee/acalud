import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-15 · Enviar Propuesta de Juego — contra la app real + PostgreSQL real.
describe('CU-15 · Enviar Propuesta de Juego', () => {
  let ctx: CtxApp;
  let token: string;
  let adminId: string;
  let materiaId: string;
  let nivelId: string;

  const propuestaValida = {
    titulo: 'Juego de fracciones con piezas magnéticas',
    descripcion: 'Una propuesta para trabajar fracciones equivalentes usando piezas magnéticas de colores en el aula de primaria.',
    materia_id: null as string | null,
    nivel_educativo_id: null as string | null,
  };

  beforeAll(async () => {
    ctx = await levantarApp();

    const PW = 'Password123!';
    await ctx.request
      .post('/api/v1/auth/registro')
      .send({ email: 'propone@test.com', contrasena: PW, nombre: 'Ana', apellido: 'Docente' });
    await ctx.pg.query(`UPDATE users SET email_verified = true WHERE email = $1`, ['propone@test.com']);
    const login = await ctx.request.post('/api/v1/auth/sesion').send({ email: 'propone@test.com', contrasena: PW });
    token = login.body.token;

    await ctx.request
      .post('/api/v1/auth/registro')
      .send({ email: 'editorial@test.com', contrasena: PW, nombre: 'Equipo', apellido: 'Editorial' });
    await ctx.pg.query(
      `UPDATE users SET email_verified = true, role = 'admin' WHERE email = $1`,
      ['editorial@test.com'],
    );
    adminId = (await ctx.pg.query(`SELECT id FROM users WHERE email = $1`, ['editorial@test.com'])).rows[0].id;

    materiaId = (await ctx.pg.query(`SELECT id FROM subjects WHERE name = 'Matemática'`)).rows[0].id;
    nivelId = (await ctx.pg.query(`SELECT id FROM levels WHERE name = 'Primaria'`)).rows[0].id;
  });

  afterAll(async () => {
    await ctx?.detener();
  });

  it('A6/RNF-007: usuario anónimo no puede enviar propuestas (401)', async () => {
    const res = await ctx.request.post('/api/v1/proposals').send(propuestaValida);
    expect(res.status).toBe(401);
  });

  it('A1: título vacío responde 422', async () => {
    const res = await ctx.request
      .post('/api/v1/proposals')
      .set('Cookie', `acalud_sesion=${token}`)
      .send({ ...propuestaValida, titulo: '' });
    expect(res.status).toBe(422);
  });

  it('A2/RN-002: descripción de menos de 50 caracteres responde 422', async () => {
    const res = await ctx.request
      .post('/api/v1/proposals')
      .set('Cookie', `acalud_sesion=${token}`)
      .send({ ...propuestaValida, descripcion: 'Muy corta' });
    expect(res.status).toBe(422);
  });

  it('A8: materia inexistente responde 422', async () => {
    const res = await ctx.request
      .post('/api/v1/proposals')
      .set('Cookie', `acalud_sesion=${token}`)
      .send({ ...propuestaValida, materia_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' });
    expect(res.status).toBe(422);
  });

  it('nivel educativo inexistente responde 422', async () => {
    const res = await ctx.request
      .post('/api/v1/proposals')
      .set('Cookie', `acalud_sesion=${token}`)
      .send({ ...propuestaValida, nivel_educativo_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' });
    expect(res.status).toBe(422);
  });

  it('flujo principal: crea la propuesta pending, audita y notifica al equipo editorial', async () => {
    const res = await ctx.request
      .post('/api/v1/proposals')
      .set('Cookie', `acalud_sesion=${token}`)
      .send({ ...propuestaValida, materia_id: materiaId, nivel_educativo_id: nivelId });

    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('pending');
    expect(res.body.materia_id).toBe(materiaId);

    const fila = await ctx.pg.query('SELECT * FROM proposals WHERE id = $1', [res.body.id]);
    expect(fila.rows[0].status).toBe('pending');

    const auditoria = await ctx.pg.query(
      `SELECT * FROM audit_log WHERE entity_type = 'proposal' AND entity_id = $1 AND action = 'create'`,
      [res.body.id],
    );
    expect(auditoria.rows).toHaveLength(1);

    const notif = await ctx.pg.query(
      `SELECT * FROM notifications WHERE recipient_user_id = $1 AND related_entity_id = $2`,
      [adminId, res.body.id],
    );
    expect(notif.rows).toHaveLength(1);

    const email = await ctx.pg.query(
      `SELECT * FROM outbox_emails WHERE recipient = 'editorial@test.com' AND template = 'propuesta-recibida'`,
    );
    expect(email.rows.length).toBeGreaterThanOrEqual(1);
  });

  it('A3/RN-006: una segunda propuesta con el mismo título responde 409', async () => {
    const res = await ctx.request
      .post('/api/v1/proposals')
      .set('Cookie', `acalud_sesion=${token}`)
      .send(propuestaValida); // mismo título que la ya creada arriba
    expect(res.status).toBe(409);
  });

  it('un título distinto del mismo usuario sí se acepta', async () => {
    const res = await ctx.request
      .post('/api/v1/proposals')
      .set('Cookie', `acalud_sesion=${token}`)
      .send({ ...propuestaValida, titulo: 'Otra propuesta completamente distinta' });
    expect(res.status).toBe(201);
  });

  it('RN-004: el docente puede ver el listado de sus propias propuestas', async () => {
    const res = await ctx.request.get('/api/v1/proposals').set('Cookie', `acalud_sesion=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body.every((p: { estado: string }) => p.estado === 'pending')).toBe(true);
  });

  it('GET /proposals también exige sesión (401)', async () => {
    const res = await ctx.request.get('/api/v1/proposals');
    expect(res.status).toBe(401);
  });
});
