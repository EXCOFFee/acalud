import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-19 A7 · Gestión de categorías (ABM) — contra la app real + PostgreSQL real.
describe('CU-19 A7 · ABM de Categorías (admin)', () => {
  let ctx: CtxApp;
  let adminToken: string;
  let docenteToken: string;

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

    adminToken = await crearUsuario('admin-cat@test.com', true);
    docenteToken = await crearUsuario('docente-cat@test.com', false);
  });

  afterAll(async () => {
    await ctx?.detener();
  });

  describe('Autorización (RN-001)', () => {
    it('sin sesión responde 401', async () => {
      const res = await ctx.request.post('/api/v1/admin/categories').send({ nombre: 'Física' });
      expect(res.status).toBe(401);
    });

    it('autenticado pero sin rol admin responde 403', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/categories')
        .set('Cookie', `acalud_sesion=${docenteToken}`)
        .send({ nombre: 'Física' });
      expect(res.status).toBe(403);
    });
  });

  describe('Alta de categoría (A7.4-A7.8)', () => {
    it('A7.4: rechaza nombre vacío con 422', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/categories')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ nombre: '' });
      expect(res.status).toBe(422);
    });

    it('crea la categoría y registra la auditoría', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/categories')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ nombre: 'Física ABM Test' });

      expect(res.status).toBe(201);
      expect(res.body.nombre).toBe('Física ABM Test');

      const fila = await ctx.pg.query('SELECT * FROM categories WHERE id = $1', [res.body.id]);
      expect(fila.rows).toHaveLength(1);

      const auditoria = await ctx.pg.query(
        `SELECT * FROM audit_log WHERE entity_type = 'category' AND entity_id = $1 AND action = 'create'`,
        [res.body.id],
      );
      expect(auditoria.rows).toHaveLength(1);
    });

    it('A7.5: nombre duplicado responde 409', async () => {
      await ctx.request
        .post('/api/v1/admin/categories')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ nombre: 'Química ABM Test' });

      const res = await ctx.request
        .post('/api/v1/admin/categories')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ nombre: 'Química ABM Test' });
      expect(res.status).toBe(409);
    });
  });

  describe('Listado (A7.2)', () => {
    it('lista las categorías existentes', async () => {
      const res = await ctx.request
        .get('/api/v1/admin/categories')
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((c: { nombre: string }) => c.nombre === 'Física ABM Test')).toBe(true);
    });
  });

  describe('Edición (A7.3)', () => {
    it('edita una categoría existente', async () => {
      const alta = await ctx.request
        .post('/api/v1/admin/categories')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ nombre: 'Historia ABM Test' });
      const id = alta.body.id as string;

      const res = await ctx.request
        .put(`/api/v1/admin/categories/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ nombre: 'Historia y Geografía ABM Test' });

      expect(res.status).toBe(200);
      expect(res.body.nombre).toBe('Historia y Geografía ABM Test');

      const auditoria = await ctx.pg.query(
        `SELECT * FROM audit_log WHERE entity_type = 'category' AND entity_id = $1 AND action = 'update'`,
        [id],
      );
      expect(auditoria.rows).toHaveLength(1);
    });

    it('editar una categoría inexistente responde 404', async () => {
      const res = await ctx.request
        .put('/api/v1/admin/categories/dddddddd-dddd-4ddd-8ddd-dddddddddddd')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ nombre: 'No importa' });
      expect(res.status).toBe(404);
    });
  });

  describe('Baja (A7.3)', () => {
    it('elimina la categoría y libera los productos que la usaban (category_id -> null)', async () => {
      const alta = await ctx.request
        .post('/api/v1/admin/categories')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ nombre: 'Arte ABM Test' });
      const id = alta.body.id as string;

      const producto = await ctx.pg.query(
        `INSERT INTO products (name, price, stock, category_id, is_active) VALUES ('Prod con categoría', 100, 1, $1, true) RETURNING id`,
        [id],
      );
      const productoId = producto.rows[0].id;

      const res = await ctx.request
        .delete(`/api/v1/admin/categories/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(204);

      const filaCategoria = await ctx.pg.query('SELECT * FROM categories WHERE id = $1', [id]);
      expect(filaCategoria.rows).toHaveLength(0);

      const filaProducto = await ctx.pg.query('SELECT category_id FROM products WHERE id = $1', [
        productoId,
      ]);
      expect(filaProducto.rows[0].category_id).toBeNull();

      const auditoria = await ctx.pg.query(
        `SELECT * FROM audit_log WHERE entity_type = 'category' AND entity_id = $1 AND action = 'delete'`,
        [id],
      );
      expect(auditoria.rows).toHaveLength(1);
    });

    it('eliminar una categoría inexistente responde 404', async () => {
      const res = await ctx.request
        .delete('/api/v1/admin/categories/dddddddd-dddd-4ddd-8ddd-dddddddddddd')
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(404);
    });
  });
});
