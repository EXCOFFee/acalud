import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-18 · Guardar Favorito — contra la app real + PostgreSQL real.
describe('CU-18 · Guardar Favorito', () => {
  let ctx: CtxApp;
  let token: string;
  let otroToken: string;
  let productoId: string;
  let recursoId: string;
  let editorialId: string;

  beforeAll(async () => {
    ctx = await levantarApp();

    const PW = 'Password123!';
    const crearUsuario = async (email: string): Promise<string> => {
      await ctx.request
        .post('/api/v1/auth/registro')
        .send({ email, contrasena: PW, nombre: 'Test', apellido: 'User' });
      await ctx.pg.query(`UPDATE users SET email_verified = true WHERE email = $1`, [email]);
      const login = await ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena: PW });
      return login.body.token as string;
    };
    token = await crearUsuario('favoritea@test.com');
    otroToken = await crearUsuario('otro-favoritea@test.com');

    const producto = await ctx.pg.query(
      `INSERT INTO products (name, price, stock, is_active) VALUES ('Producto Favorito Test', 100, 5, true) RETURNING id`,
    );
    productoId = producto.rows[0].id;

    const recurso = await ctx.pg.query(
      `INSERT INTO resources (product_id, title, is_licensed, type, url) VALUES ($1, 'Recurso Favorito Test', false, 'pdf', 'r/test') RETURNING id`,
      [productoId],
    );
    recursoId = recurso.rows[0].id;

    const editorial = await ctx.pg.query(
      `INSERT INTO editorial_partners (name, is_active) VALUES ('Editorial Favorita Test', true) RETURNING id`,
    );
    editorialId = editorial.rows[0].id;
  });

  afterAll(async () => {
    await ctx?.detener();
  });

  it('RN-008: usuario anónimo no puede guardar favoritos (401)', async () => {
    const res = await ctx.request.post('/api/v1/favorites').send({ producto_id: productoId });
    expect(res.status).toBe(401);
  });

  it('GET /favorites también exige sesión (401)', async () => {
    const res = await ctx.request.get('/api/v1/favorites');
    expect(res.status).toBe(401);
  });

  it('A3: sin ningún id responde 422', async () => {
    const res = await ctx.request.post('/api/v1/favorites').set('Cookie', `acalud_sesion=${token}`).send({});
    expect(res.status).toBe(422);
  });

  it('A3: dos ids a la vez responde 422 (exactamente uno)', async () => {
    const res = await ctx.request
      .post('/api/v1/favorites')
      .set('Cookie', `acalud_sesion=${token}`)
      .send({ producto_id: productoId, recurso_id: recursoId });
    expect(res.status).toBe(422);
  });

  it('A4: producto inexistente responde 404', async () => {
    const res = await ctx.request
      .post('/api/v1/favorites')
      .set('Cookie', `acalud_sesion=${token}`)
      .send({ producto_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' });
    expect(res.status).toBe(404);
  });

  let favoritoProductoId: string;

  it('flujo principal: guarda un producto como favorito', async () => {
    const res = await ctx.request
      .post('/api/v1/favorites')
      .set('Cookie', `acalud_sesion=${token}`)
      .send({ producto_id: productoId });
    expect(res.status).toBe(201);
    expect(res.body.producto_id).toBe(productoId);
    favoritoProductoId = res.body.id;

    const fila = await ctx.pg.query('SELECT * FROM favorites WHERE id = $1', [favoritoProductoId]);
    expect(fila.rows).toHaveLength(1);
  });

  it('A2/RN-001: guardar el mismo producto de nuevo responde 409', async () => {
    const res = await ctx.request
      .post('/api/v1/favorites')
      .set('Cookie', `acalud_sesion=${token}`)
      .send({ producto_id: productoId });
    expect(res.status).toBe(409);
  });

  it('el mismo usuario puede guardar un recurso y una editorial (tipos distintos)', async () => {
    const resRecurso = await ctx.request
      .post('/api/v1/favorites')
      .set('Cookie', `acalud_sesion=${token}`)
      .send({ recurso_id: recursoId });
    expect(resRecurso.status).toBe(201);

    const resEditorial = await ctx.request
      .post('/api/v1/favorites')
      .set('Cookie', `acalud_sesion=${token}`)
      .send({ editorial_id: editorialId });
    expect(resEditorial.status).toBe(201);
  });

  it('A9: lista los tres favoritos con el título resuelto por tipo', async () => {
    const res = await ctx.request.get('/api/v1/favorites').set('Cookie', `acalud_sesion=${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);

    const porProducto = res.body.find((f: { tipo: string }) => f.tipo === 'product');
    expect(porProducto.titulo).toBe('Producto Favorito Test');
    const porRecurso = res.body.find((f: { tipo: string }) => f.tipo === 'resource');
    expect(porRecurso.titulo).toBe('Recurso Favorito Test');
    const porEditorial = res.body.find((f: { tipo: string }) => f.tipo === 'editorial_partner');
    expect(porEditorial.titulo).toBe('Editorial Favorita Test');
  });

  it('otro usuario no ve los favoritos ajenos', async () => {
    const res = await ctx.request.get('/api/v1/favorites').set('Cookie', `acalud_sesion=${otroToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  describe('Eliminar (A7, toggle inverso)', () => {
    it('A7: elimina un favorito propio', async () => {
      const res = await ctx.request
        .delete(`/api/v1/favorites/${favoritoProductoId}`)
        .set('Cookie', `acalud_sesion=${token}`);
      expect(res.status).toBe(204);

      const fila = await ctx.pg.query('SELECT * FROM favorites WHERE id = $1', [favoritoProductoId]);
      expect(fila.rows).toHaveLength(0);
    });

    it('eliminar un favorito ajeno responde 404 (no lo borra)', async () => {
      const resRecurso = await ctx.request
        .post('/api/v1/favorites')
        .set('Cookie', `acalud_sesion=${otroToken}`)
        .send({ producto_id: productoId });
      const favoritoAjenoId = resRecurso.body.id as string;

      const res = await ctx.request
        .delete(`/api/v1/favorites/${favoritoAjenoId}`)
        .set('Cookie', `acalud_sesion=${token}`); // token, no otroToken
      expect(res.status).toBe(404);

      const fila = await ctx.pg.query('SELECT * FROM favorites WHERE id = $1', [favoritoAjenoId]);
      expect(fila.rows).toHaveLength(1); // sigue existiendo
    });

    it('eliminar un favorito inexistente responde 404', async () => {
      const res = await ctx.request
        .delete('/api/v1/favorites/dddddddd-dddd-4ddd-8ddd-dddddddddddd')
        .set('Cookie', `acalud_sesion=${token}`);
      expect(res.status).toBe(404);
    });
  });
});
