import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-16 · Ver Resultados de Encuestas (público) — contra la app real + PostgreSQL real.
describe('CU-16 · Resultados de Encuestas (público)', () => {
  let ctx: CtxApp;
  let token: string;
  let userId: string;
  let nivelPrimariaId: string;

  let pollActivaId: string;
  let opcionAId: string;
  let opcionBId: string;
  let pollCerradaId: string;
  let pollBorradorId: string;
  let pollSinVotosId: string;

  beforeAll(async () => {
    ctx = await levantarApp();

    const PW = 'Password123!';
    await ctx.request
      .post('/api/v1/auth/registro')
      .send({ email: 'encuestas-lector@test.com', contrasena: PW, nombre: 'Test', apellido: 'User' });
    await ctx.pg.query(`UPDATE users SET email_verified = true WHERE email = $1`, ['encuestas-lector@test.com']);
    const login = await ctx.request
      .post('/api/v1/auth/sesion')
      .send({ email: 'encuestas-lector@test.com', contrasena: PW });
    token = login.body.token;
    userId = (
      await ctx.pg.query(`SELECT id FROM users WHERE email = $1`, ['encuestas-lector@test.com'])
    ).rows[0].id;

    nivelPrimariaId = (await ctx.pg.query(`SELECT id FROM levels WHERE name = 'Primaria'`)).rows[0].id;

    const activa = await ctx.pg.query(
      `INSERT INTO polls (question, status, target_level_id) VALUES ('¿Te gustó la demo?', 'active', $1) RETURNING id`,
      [nivelPrimariaId],
    );
    pollActivaId = activa.rows[0].id;
    const opA = await ctx.pg.query(`INSERT INTO poll_options (poll_id, text) VALUES ($1, 'Sí') RETURNING id`, [pollActivaId]);
    const opB = await ctx.pg.query(`INSERT INTO poll_options (poll_id, text) VALUES ($1, 'No') RETURNING id`, [pollActivaId]);
    opcionAId = opA.rows[0].id;
    opcionBId = opB.rows[0].id;
    // 2 votos a "Sí", 1 voto a "No" (el del usuario logueado, para el destacado A4).
    const otro1 = await ctx.pg.query(`INSERT INTO users (email, password_hash, full_name, email_verified) VALUES ('votante1@test.com', 'x', 'V Uno', true) RETURNING id`);
    const otro2 = await ctx.pg.query(`INSERT INTO users (email, password_hash, full_name, email_verified) VALUES ('votante2@test.com', 'x', 'V Dos', true) RETURNING id`);
    await ctx.pg.query(`INSERT INTO poll_responses (poll_id, option_id, user_id) VALUES ($1,$2,$3)`, [pollActivaId, opcionAId, otro1.rows[0].id]);
    await ctx.pg.query(`INSERT INTO poll_responses (poll_id, option_id, user_id) VALUES ($1,$2,$3)`, [pollActivaId, opcionAId, otro2.rows[0].id]);
    await ctx.pg.query(`INSERT INTO poll_responses (poll_id, option_id, user_id) VALUES ($1,$2,$3)`, [pollActivaId, opcionBId, userId]);

    const cerrada = await ctx.pg.query(`INSERT INTO polls (question, status) VALUES ('Encuesta finalizada', 'closed') RETURNING id`);
    pollCerradaId = cerrada.rows[0].id;
    await ctx.pg.query(`INSERT INTO poll_options (poll_id, text) VALUES ($1, 'A'), ($1, 'B')`, [pollCerradaId]);

    const borrador = await ctx.pg.query(`INSERT INTO polls (question, status) VALUES ('Todavía no publicada', 'draft') RETURNING id`);
    pollBorradorId = borrador.rows[0].id;
    await ctx.pg.query(`INSERT INTO poll_options (poll_id, text) VALUES ($1, 'A'), ($1, 'B')`, [pollBorradorId]);

    const sinVotos = await ctx.pg.query(`INSERT INTO polls (question, status) VALUES ('Sin respuestas aún', 'active') RETURNING id`);
    pollSinVotosId = sinVotos.rows[0].id;
    await ctx.pg.query(`INSERT INTO poll_options (poll_id, text) VALUES ($1, 'A'), ($1, 'B')`, [pollSinVotosId]);
  });

  afterAll(async () => {
    await ctx?.detener();
  });

  describe('Listado (§4, sin auth requerida)', () => {
    it('lista encuestas activas y finalizadas, nunca las draft', async () => {
      const res = await ctx.request.get('/api/v1/polls');
      expect(res.status).toBe(200);
      const ids = res.body.map((e: { id: string }) => e.id);
      expect(ids).toContain(pollActivaId);
      expect(ids).toContain(pollCerradaId);
      expect(ids).not.toContain(pollBorradorId);
    });

    it('A6: filtra por estado', async () => {
      const res = await ctx.request.get('/api/v1/polls?status=closed');
      expect(res.status).toBe(200);
      const ids = res.body.map((e: { id: string }) => e.id);
      expect(ids).toContain(pollCerradaId);
      expect(ids).not.toContain(pollActivaId);
    });

    it('filtra por nivel educativo', async () => {
      const res = await ctx.request.get(`/api/v1/polls?level_id=${nivelPrimariaId}`);
      expect(res.status).toBe(200);
      const ids = res.body.map((e: { id: string }) => e.id);
      expect(ids).toContain(pollActivaId);
      expect(ids).not.toContain(pollCerradaId);
    });
  });

  describe('Resultados (§4)', () => {
    it('anónimo ve resultados agregados con porcentajes, sin destacar voto', async () => {
      const res = await ctx.request.get(`/api/v1/polls/${pollActivaId}/results`);
      expect(res.status).toBe(200);
      expect(res.body.total_votos).toBe(3);
      expect(res.body.ya_voto).toBe(false);
      expect(res.body.opcion_votada_id).toBeNull();
      const opA = res.body.opciones.find((o: { id: string }) => o.id === opcionAId);
      expect(opA.votos).toBe(2);
      expect(opA.porcentaje).toBeCloseTo(66.7, 1);
    });

    it('A4: usuario logueado que ya votó ve su opción destacada', async () => {
      const res = await ctx.request
        .get(`/api/v1/polls/${pollActivaId}/results`)
        .set('Cookie', `acalud_sesion=${token}`);
      expect(res.status).toBe(200);
      expect(res.body.ya_voto).toBe(true);
      expect(res.body.opcion_votada_id).toBe(opcionBId);
    });

    it('A1/RN-007: encuesta sin votos responde 0% para todas las opciones', async () => {
      const res = await ctx.request.get(`/api/v1/polls/${pollSinVotosId}/results`);
      expect(res.status).toBe(200);
      expect(res.body.total_votos).toBe(0);
      expect(res.body.opciones.every((o: { porcentaje: number }) => o.porcentaje === 0)).toBe(true);
    });

    it('funciona también para encuestas finalizadas (closed)', async () => {
      const res = await ctx.request.get(`/api/v1/polls/${pollCerradaId}/results`);
      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('closed');
    });

    it('A2: encuesta en borrador (draft) responde 404 (no publicada)', async () => {
      const res = await ctx.request.get(`/api/v1/polls/${pollBorradorId}/results`);
      expect(res.status).toBe(404);
    });

    it('A2: encuesta inexistente responde 404', async () => {
      const res = await ctx.request.get('/api/v1/polls/dddddddd-dddd-4ddd-8ddd-dddddddddddd/results');
      expect(res.status).toBe(404);
    });
  });
});
