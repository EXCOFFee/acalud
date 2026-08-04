import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-19 A8 · Gestión de demos (asignación a producto) — contra la app real + PostgreSQL real.
describe('CU-19 A8 · Asignación de Demo (admin)', () => {
  let ctx: CtxApp;
  let adminToken: string;
  let docenteToken: string;
  let productoId: string;

  beforeAll(async () => {
    ctx = await levantarApp();

    const PW = 'Password123!';

    const crearUsuario = async (email: string, esAdmin: boolean): Promise<string> => {
      await ctx.request
        .post('/api/v1/auth/registro')
        .send({ email, contrasena: PW, nombre: 'Test', apellido: 'User' });
      await ctx.pg.query(`UPDATE users SET email_verified = true WHERE email = $1`, [email]);
      if (esAdmin) {
        await ctx.pg.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [email]);
      }
      const login = await ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena: PW });
      return login.body.token as string;
    };

    adminToken = await crearUsuario('admin-demo@test.com', true);
    docenteToken = await crearUsuario('docente-demo@test.com', false);

    const producto = await ctx.pg.query(
      `INSERT INTO products (name, price, stock, is_active) VALUES ('Producto con Demo Test', 100, 10, true) RETURNING id`,
    );
    productoId = producto.rows[0].id;
  });

  afterAll(async () => {
    await ctx?.detener();
  });

  describe('Autorización (RN-001)', () => {
    it('sin sesión responde 401', async () => {
      const res = await ctx.request
        .put(`/api/v1/admin/products/${productoId}/demo`)
        .send({ configuracion_json: { maxTurnsAnonymous: 5 } });
      expect(res.status).toBe(401);
    });

    it('autenticado pero sin rol admin responde 403', async () => {
      const res = await ctx.request
        .put(`/api/v1/admin/products/${productoId}/demo`)
        .set('Cookie', `acalud_sesion=${docenteToken}`)
        .send({ configuracion_json: { maxTurnsAnonymous: 5 } });
      expect(res.status).toBe(403);
    });
  });

  describe('Alta y edición (A8.3-A8.10)', () => {
    it('crea la demo (alta) con la configuración JSON y la URL de Unity WebGL', async () => {
      const res = await ctx.request
        .put(`/api/v1/admin/products/${productoId}/demo`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({
          configuracion_json: { maxTurnsAnonymous: 5, maxDurationSeconds: 120 },
          url_unity_webgl: 'https://unity.test/build',
        });

      expect(res.status).toBe(200);
      expect(res.body.producto_id).toBe(productoId);
      expect(res.body.configuracion_json.maxTurnsAnonymous).toBe(5);
      expect(res.body.configuracion_json.unity_webgl_url).toBe('https://unity.test/build');

      const fila = await ctx.pg.query('SELECT * FROM demos WHERE product_id = $1', [productoId]);
      expect(fila.rows).toHaveLength(1);

      const auditoria = await ctx.pg.query(
        `SELECT * FROM audit_log WHERE entity_type = 'demo' AND entity_id = $1`,
        [fila.rows[0].id],
      );
      expect(auditoria.rows).toHaveLength(1);
    });

    it('A8.8: una segunda asignación actualiza (upsert), no duplica la fila', async () => {
      await ctx.request
        .put(`/api/v1/admin/products/${productoId}/demo`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ configuracion_json: { maxTurnsAnonymous: 10 } });

      const fila = await ctx.pg.query('SELECT * FROM demos WHERE product_id = $1', [productoId]);
      expect(fila.rows).toHaveLength(1);
      expect(fila.rows[0].config_json.maxTurnsAnonymous).toBe(10);
    });

    it('producto inexistente responde 404', async () => {
      const res = await ctx.request
        .put('/api/v1/admin/products/dddddddd-dddd-4ddd-8ddd-dddddddddddd/demo')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ configuracion_json: { maxTurnsAnonymous: 5 } });
      expect(res.status).toBe(404);
    });

    it('A8.7: configuracion_json ausente responde 422', async () => {
      const res = await ctx.request
        .put(`/api/v1/admin/products/${productoId}/demo`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({});
      expect(res.status).toBe(422);
    });
  });

  describe('Detalle de demo (precarga del formulario de edición)', () => {
    it('producto sin demo asignada devuelve asignada:false, no 404', async () => {
      const producto = await ctx.pg.query<{ id: string }>(
        `INSERT INTO products (name, price, stock, is_active) VALUES ('Producto Sin Demo Test', 100, 10, true) RETURNING id`,
      );
      const id = producto.rows[0]!.id;

      const res = await ctx.request
        .get(`/api/v1/admin/products/${id}/demo`)
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.asignada).toBe(false);
      expect(res.body.configuracion_json).toBeNull();
    });

    it('devuelve la configuración completa de una demo ya asignada', async () => {
      await ctx.request
        .put(`/api/v1/admin/products/${productoId}/demo`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({
          configuracion_json: { tipo: 'publica', formato: 'html5', contenido_ref: 'https://demo.test/embed' },
          url_unity_webgl: 'https://unity.test/build',
        });

      const res = await ctx.request
        .get(`/api/v1/admin/products/${productoId}/demo`)
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.asignada).toBe(true);
      expect(res.body.producto_id).toBe(productoId);
      expect(res.body.configuracion_json.tipo).toBe('publica');
      expect(res.body.configuracion_json.formato).toBe('html5');
      expect(res.body.configuracion_json.contenido_ref).toBe('https://demo.test/embed');
      expect(res.body.configuracion_json.unity_webgl_url).toBe('https://unity.test/build');
    });

    it('producto inexistente responde 404', async () => {
      const res = await ctx.request
        .get('/api/v1/admin/products/dddddddd-dddd-4ddd-8ddd-dddddddddddd/demo')
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(404);
    });

    it('sin rol admin responde 403', async () => {
      const res = await ctx.request
        .get(`/api/v1/admin/products/${productoId}/demo`)
        .set('Cookie', `acalud_sesion=${docenteToken}`);
      expect(res.status).toBe(403);
    });
  });
});
