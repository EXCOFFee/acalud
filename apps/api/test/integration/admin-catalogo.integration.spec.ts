import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-19 · Gestionar Catálogo (ABM) — solo Productos, contra la app real + PostgreSQL real.
describe('CU-19 · ABM de Productos (admin)', () => {
  let ctx: CtxApp;
  let adminToken: string;
  let docenteToken: string;
  let categoriaId: string;

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

    adminToken = await crearUsuario('admin@test.com', true);
    docenteToken = await crearUsuario('docente@test.com', false);

    const cat = await ctx.pg.query(
      `INSERT INTO categories (name) VALUES ('Ciencias ABM Test') RETURNING id`,
    );
    categoriaId = cat.rows[0].id;
  });

  afterAll(async () => {
    await ctx?.detener();
  });

  const productoValido = {
    titulo: 'Juego Nuevo',
    descripcion: 'Descripción de prueba',
    precio: 1000,
    stock: 20,
    marca_propia: true,
    url_externa: null,
    categoria_id: null,
    umbral_mayorista: null,
    descuento_mayorista_porcentaje: null,
    imagen_url: null,
  };

  describe('Autorización (RN-001)', () => {
    it('sin sesión responde 401', async () => {
      const res = await ctx.request.post('/api/v1/admin/products').send(productoValido);
      expect(res.status).toBe(401);
    });

    it('autenticado pero sin rol admin responde 403', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${docenteToken}`)
        .send(productoValido);
      expect(res.status).toBe(403);
    });
  });

  describe('Alta de producto (flujo principal + A3/A4/A5)', () => {
    it('A3: rechaza título vacío con 422', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, titulo: '' });
      expect(res.status).toBe(422);
    });

    it('RN-006: rechaza precio negativo con 422', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, precio: -1 });
      expect(res.status).toBe(422);
    });

    it('A4/RN-003: producto de terceros sin url_externa responde 422', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, marca_propia: false, url_externa: null });
      expect(res.status).toBe(422);
    });

    it('RN-004: producto propio con url_externa responde 422', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, marca_propia: true, url_externa: 'https://externo.com/x' });
      expect(res.status).toBe(422);
    });

    it('A5/RN-005: umbral mayorista sin porcentaje responde 422', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, umbral_mayorista: 5, descuento_mayorista_porcentaje: null });
      expect(res.status).toBe(422);
    });

    it('categoría inexistente responde 422', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, categoria_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' });
      expect(res.status).toBe(422);
    });

    it('crea el producto, lo activa y registra la auditoría (p9-p18)', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, categoria_id: categoriaId, precio: 2500, stock: 15 });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.titulo).toBe('Juego Nuevo');
      expect(res.body.activo).toBe(true);

      const fila = await ctx.pg.query('SELECT * FROM products WHERE id = $1', [res.body.id]);
      expect(fila.rows[0].is_active).toBe(true);
      expect(Number(fila.rows[0].price)).toBe(2500);

      const auditoria = await ctx.pg.query(
        `SELECT * FROM audit_log WHERE entity_type = 'product' AND entity_id = $1 AND action = 'create'`,
        [res.body.id],
      );
      expect(auditoria.rows).toHaveLength(1);
      expect(auditoria.rows[0].actor_user_id).not.toBeNull();
    });
  });

  describe('Edición de producto (A1)', () => {
    it('edita un producto existente', async () => {
      const alta = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send(productoValido);
      const id = alta.body.id as string;

      const res = await ctx.request
        .put(`/api/v1/admin/products/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, stock: 999 });

      expect(res.status).toBe(200);
      expect(res.body.stock).toBe(999);

      const auditoria = await ctx.pg.query(
        `SELECT * FROM audit_log WHERE entity_type = 'product' AND entity_id = $1 AND action = 'update'`,
        [id],
      );
      expect(auditoria.rows).toHaveLength(1);
    });

    it('editar un producto inexistente responde 404', async () => {
      const res = await ctx.request
        .put('/api/v1/admin/products/dddddddd-dddd-4ddd-8ddd-dddddddddddd')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send(productoValido);
      expect(res.status).toBe(404);
    });
  });

  describe('Baja lógica de producto (A2/RNF-008)', () => {
    it('desactiva el producto sin borrarlo físicamente y dispara auditoría', async () => {
      const alta = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send(productoValido);
      const id = alta.body.id as string;

      const res = await ctx.request
        .delete(`/api/v1/admin/products/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.activo).toBe(false);

      const fila = await ctx.pg.query('SELECT is_active FROM products WHERE id = $1', [id]);
      expect(fila.rows).toHaveLength(1); // sigue existiendo la fila: baja lógica, no física
      expect(fila.rows[0].is_active).toBe(false);

      const auditoria = await ctx.pg.query(
        `SELECT * FROM audit_log WHERE entity_type = 'product' AND entity_id = $1 AND action = 'delete'`,
        [id],
      );
      expect(auditoria.rows).toHaveLength(1);

      // El catálogo público ya no lo lista (is_active = false).
      const publico = await ctx.request.get('/api/v1/catalogo/juegos');
      const ids = publico.body.datos.map((j: { id: string }) => j.id);
      expect(ids).not.toContain(id);
    });

    it('desactivar un producto inexistente responde 404', async () => {
      const res = await ctx.request
        .delete('/api/v1/admin/products/dddddddd-dddd-4ddd-8ddd-dddddddddddd')
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(404);
    });
  });
});
