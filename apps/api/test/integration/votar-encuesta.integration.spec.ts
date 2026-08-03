import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-14 · Participar en Encuesta — contra la app real + PostgreSQL real.
describe('CU-14 · Votar Encuesta', () => {
  let ctx: CtxApp;
  let token: string;

  let pollActivaId: string;
  let opcionAId: string;
  let opcionBId: string;
  let pollCerradaId: string;
  let opcionCerradaId: string;
  let pollOtraId: string;
  let opcionOtraId: string;

  beforeAll(async () => {
    ctx = await levantarApp();

    const PW = 'Password123!';
    await ctx.request
      .post('/api/v1/auth/registro')
      .send({ email: 'votante@test.com', contrasena: PW, nombre: 'Test', apellido: 'User' });
    await ctx.pg.query(`UPDATE users SET email_verified = true WHERE email = $1`, ['votante@test.com']);
    const login = await ctx.request.post('/api/v1/auth/sesion').send({ email: 'votante@test.com', contrasena: PW });
    token = login.body.token;

    const activa = await ctx.pg.query(`INSERT INTO polls (question, status) VALUES ('¿Encuesta activa?', 'active') RETURNING id`);
    pollActivaId = activa.rows[0].id;
    const opA = await ctx.pg.query(`INSERT INTO poll_options (poll_id, text) VALUES ($1, 'Sí') RETURNING id`, [pollActivaId]);
    const opB = await ctx.pg.query(`INSERT INTO poll_options (poll_id, text) VALUES ($1, 'No') RETURNING id`, [pollActivaId]);
    opcionAId = opA.rows[0].id;
    opcionBId = opB.rows[0].id;

    const cerrada = await ctx.pg.query(`INSERT INTO polls (question, status) VALUES ('Encuesta cerrada', 'closed') RETURNING id`);
    pollCerradaId = cerrada.rows[0].id;
    const opC = await ctx.pg.query(`INSERT INTO poll_options (poll_id, text) VALUES ($1, 'X') RETURNING id`, [pollCerradaId]);
    opcionCerradaId = opC.rows[0].id;

    const otra = await ctx.pg.query(`INSERT INTO polls (question, status) VALUES ('Otra encuesta activa', 'active') RETURNING id`);
    pollOtraId = otra.rows[0].id;
    const opOtra = await ctx.pg.query(`INSERT INTO poll_options (poll_id, text) VALUES ($1, 'Z') RETURNING id`, [pollOtraId]);
    opcionOtraId = opOtra.rows[0].id;
  });

  afterAll(async () => {
    await ctx?.detener();
  });

  it('A6/RN-006: usuario anónimo no puede votar (401)', async () => {
    const res = await ctx.request
      .post(`/api/v1/polls/${pollActivaId}/responses`)
      .send({ opcion_id: opcionAId });
    expect(res.status).toBe(401);
  });

  it('flujo principal: registra el voto y devuelve resultados actualizados', async () => {
    const res = await ctx.request
      .post(`/api/v1/polls/${pollActivaId}/responses`)
      .set('Cookie', `acalud_sesion=${token}`)
      .send({ opcion_id: opcionAId });

    expect(res.status).toBe(201);
    expect(res.body.total_votos).toBe(1);
    expect(res.body.ya_voto).toBe(true);
    expect(res.body.opcion_votada_id).toBe(opcionAId);

    const fila = await ctx.pg.query('SELECT * FROM poll_responses WHERE poll_id = $1', [pollActivaId]);
    expect(fila.rows).toHaveLength(1);
  });

  it('A1/RN-001: un segundo voto en la misma encuesta responde 409', async () => {
    const res = await ctx.request
      .post(`/api/v1/polls/${pollActivaId}/responses`)
      .set('Cookie', `acalud_sesion=${token}`)
      .send({ opcion_id: opcionBId });
    expect(res.status).toBe(409);

    const fila = await ctx.pg.query('SELECT * FROM poll_responses WHERE poll_id = $1', [pollActivaId]);
    expect(fila.rows).toHaveLength(1); // no se duplicó ni cambió
  });

  it('el mismo usuario puede votar en OTRA encuesta activa distinta', async () => {
    const res = await ctx.request
      .post(`/api/v1/polls/${pollOtraId}/responses`)
      .set('Cookie', `acalud_sesion=${token}`)
      .send({ opcion_id: opcionOtraId });
    expect(res.status).toBe(201);
  });

  it('A2: votar en una encuesta cerrada responde 404', async () => {
    const res = await ctx.request
      .post(`/api/v1/polls/${pollCerradaId}/responses`)
      .set('Cookie', `acalud_sesion=${token}`)
      .send({ opcion_id: opcionCerradaId });
    expect(res.status).toBe(404);
  });

  it('encuesta inexistente responde 404', async () => {
    const res = await ctx.request
      .post('/api/v1/polls/dddddddd-dddd-4ddd-8ddd-dddddddddddd/responses')
      .set('Cookie', `acalud_sesion=${token}`)
      .send({ opcion_id: opcionAId });
    expect(res.status).toBe(404);
  });

  it('opción que no pertenece a la encuesta responde 422', async () => {
    const nueva = await ctx.pg.query(`INSERT INTO polls (question, status) VALUES ('Encuesta cruzada', 'active') RETURNING id`);
    const res = await ctx.request
      .post(`/api/v1/polls/${nueva.rows[0].id}/responses`)
      .set('Cookie', `acalud_sesion=${token}`)
      .send({ opcion_id: opcionOtraId }); // pertenece a pollOtraId, no a esta
    expect(res.status).toBe(422);
  });

  it('opcion_id con formato inválido responde 422', async () => {
    const res = await ctx.request
      .post(`/api/v1/polls/${pollActivaId}/responses`)
      .set('Cookie', `acalud_sesion=${token}`)
      .send({ opcion_id: 'no-es-uuid' });
    expect(res.status).toBe(422);
  });
});
