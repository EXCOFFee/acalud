import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-17 · Explorar Editoriales Aliadas — contra la app real + PostgreSQL real.
describe('CU-17 · Explorar Editoriales Aliadas', () => {
  let ctx: CtxApp;
  let token: string;
  let userId: string;

  let activaId: string;
  let inactivaId: string;
  let sinUrlId: string;

  beforeAll(async () => {
    ctx = await levantarApp();

    const PW = 'Password123!';
    await ctx.request
      .post('/api/v1/auth/registro')
      .send({ email: 'explora@test.com', contrasena: PW, nombre: 'Test', apellido: 'User' });
    await ctx.pg.query(`UPDATE users SET email_verified = true WHERE email = $1`, ['explora@test.com']);
    const login = await ctx.request.post('/api/v1/auth/sesion').send({ email: 'explora@test.com', contrasena: PW });
    token = login.body.token;
    userId = (await ctx.pg.query(`SELECT id FROM users WHERE email = $1`, ['explora@test.com'])).rows[0].id;

    const activa = await ctx.pg.query(
      `INSERT INTO editorial_partners (name, logo_url, description, external_website_url, category, is_active)
       VALUES ('Editorial Activa Test', 'https://logo.test/a.png', 'Descripción breve', 'https://editorial.test', 'Juegos de Mesa', true)
       RETURNING id`,
    );
    activaId = activa.rows[0].id;

    const inactiva = await ctx.pg.query(
      `INSERT INTO editorial_partners (name, is_active) VALUES ('Editorial Inactiva Test', false) RETURNING id`,
    );
    inactivaId = inactiva.rows[0].id;

    const sinUrl = await ctx.pg.query(
      `INSERT INTO editorial_partners (name, description, is_active, category)
       VALUES ('Editorial Sin Sitio Test', 'Sin URL configurada', true, 'Tecnología') RETURNING id`,
    );
    sinUrlId = sinUrl.rows[0].id;
  });

  afterAll(async () => {
    await ctx?.detener();
  });

  describe('Listado (§4, A6, A7)', () => {
    it('lista solo editoriales activas', async () => {
      const res = await ctx.request.get('/api/v1/editorial-partners');
      expect(res.status).toBe(200);
      const ids = res.body.map((e: { id: string }) => e.id);
      expect(ids).toContain(activaId);
      expect(ids).toContain(sinUrlId);
      expect(ids).not.toContain(inactivaId);
    });

    it('A7: filtra por categoría', async () => {
      const res = await ctx.request.get('/api/v1/editorial-partners?category=Tecnología');
      expect(res.status).toBe(200);
      const ids = res.body.map((e: { id: string }) => e.id);
      expect(ids).toContain(sinUrlId);
      expect(ids).not.toContain(activaId);
    });

    it('A6: una categoría sin coincidencias devuelve lista vacía (no error)', async () => {
      const res = await ctx.request.get('/api/v1/editorial-partners?category=NoExiste');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('Detalle (§4 p8-p12, A3, A4)', () => {
    it('devuelve el detalle y registra editorial_partner_viewed', async () => {
      const res = await ctx.request.get(`/api/v1/editorial-partners/${activaId}`);
      expect(res.status).toBe(200);
      expect(res.body.nombre).toBe('Editorial Activa Test');
      expect(res.body.sitio_web).toBe('https://editorial.test');

      const evento = await ctx.pg.query(
        `SELECT * FROM audit_log WHERE action = 'editorial_partner_viewed' AND entity_id = $1`,
        [activaId],
      );
      expect(evento.rows).toHaveLength(1);
      expect(evento.rows[0].actor_user_id).toBeNull(); // anónimo
    });

    it('registra el user_id cuando el visitante está logueado', async () => {
      await ctx.request.get(`/api/v1/editorial-partners/${activaId}`).set('Cookie', `acalud_sesion=${token}`);
      const evento = await ctx.pg.query(
        `SELECT * FROM audit_log WHERE action = 'editorial_partner_viewed' AND entity_id = $1 AND actor_user_id = $2`,
        [activaId, userId],
      );
      expect(evento.rows).toHaveLength(1);
    });

    it('A4: editorial sin URL externa devuelve sitio_web en null (no rompe)', async () => {
      const res = await ctx.request.get(`/api/v1/editorial-partners/${sinUrlId}`);
      expect(res.status).toBe(200);
      expect(res.body.sitio_web).toBeNull();
    });

    it('A3: editorial inactiva responde 404 (recurso ajeno = 404)', async () => {
      const res = await ctx.request.get(`/api/v1/editorial-partners/${inactivaId}`);
      expect(res.status).toBe(404);
    });

    it('A3: editorial inexistente responde 404', async () => {
      const res = await ctx.request.get('/api/v1/editorial-partners/dddddddd-dddd-4ddd-8ddd-dddddddddddd');
      expect(res.status).toBe(404);
    });
  });

  describe('Click "Ir al sitio web" (A1/A2, RN-007)', () => {
    it('A1: usuario logueado -> editorial_partner_clicked con su user_id', async () => {
      const res = await ctx.request
        .post(`/api/v1/editorial-partners/${activaId}/click`)
        .set('Cookie', `acalud_sesion=${token}`);
      expect(res.status).toBe(204);

      const evento = await ctx.pg.query(
        `SELECT * FROM audit_log WHERE action = 'editorial_partner_clicked' AND entity_id = $1 AND actor_user_id = $2`,
        [activaId, userId],
      );
      expect(evento.rows).toHaveLength(1);
    });

    it('A2: usuario anónimo -> editorial_partner_clicked_anonymous sin user_id', async () => {
      const res = await ctx.request.post(`/api/v1/editorial-partners/${activaId}/click`);
      expect(res.status).toBe(204);

      const evento = await ctx.pg.query(
        `SELECT * FROM audit_log WHERE action = 'editorial_partner_clicked_anonymous' AND entity_id = $1`,
        [activaId],
      );
      expect(evento.rows).toHaveLength(1);
      expect(evento.rows[0].actor_user_id).toBeNull();
    });

    it('click sobre editorial inexistente responde 404', async () => {
      const res = await ctx.request.post(
        '/api/v1/editorial-partners/dddddddd-dddd-4ddd-8ddd-dddddddddddd/click',
      );
      expect(res.status).toBe(404);
    });
  });
});
