import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-24 · Adquirir Lote B2B (unidad 2: checkout institucional — order_type/institution_id).
describe('CU-24 · Checkout institucional', () => {
  let ctx: CtxApp;
  const PW = 'correcta-bateria-caballo-grapa';
  const DOM = {
    calle: 'Av. Siempre Viva',
    numero: '742',
    codigo_postal: '1900',
    provincia: 'Buenos Aires',
    localidad: 'La Plata',
  };
  let productoId: string;
  let institucionId: string;
  let encargadoToken: string;
  let docenteSinPermisoToken: string;

  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  beforeAll(async () => {
    ctx = await levantarApp();

    const producto = await ctx.pg.query(
      `INSERT INTO products (name, price, stock, is_active) VALUES ('Producto Checkout B2B Test', 1000, 100, true) RETURNING id`,
    );
    productoId = producto.rows[0].id;

    const institucion = await ctx.pg.query(
      `INSERT INTO institutions (legal_name, tax_id, email, status)
       VALUES ('Escuela Checkout B2B', '30-72222222-2', 'escuela-checkout@test.com', 'active') RETURNING id`,
    );
    institucionId = institucion.rows[0].id;

    const crearUsuario = async (): Promise<{ token: string; id: string }> => {
      const email = `${randomUUID()}@escuela.edu.ar`;
      await ctx.request.post('/api/v1/auth/registro').send({ email, contrasena: PW, nombre: 'N', apellido: 'A' });
      const login = await ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena: PW });
      const id = (await ctx.pg.query(`SELECT id FROM users WHERE email = $1`, [email])).rows[0].id;
      return { token: login.body.token as string, id };
    };

    const encargado = await crearUsuario();
    encargadoToken = encargado.token;
    await ctx.pg.query(
      `INSERT INTO institutional_teachers (institution_id, user_id, invited_email, is_admin, status, joined_at)
       VALUES ($1, $2, 'encargado-checkout@test.com', true, 'active', now())`,
      [institucionId, encargado.id],
    );

    const docenteSinPermiso = await crearUsuario();
    docenteSinPermisoToken = docenteSinPermiso.token;
    await ctx.pg.query(
      `INSERT INTO institutional_teachers (institution_id, user_id, invited_email, is_admin, status, joined_at)
       VALUES ($1, $2, 'docente-checkout@test.com', false, 'active', now())`,
      [institucionId, docenteSinPermiso.id],
    );
  });

  afterAll(async () => {
    await ctx?.detener();
  });

  it('RN-003: crea la orden con order_type=b2b e institution_id (flujo principal)', async () => {
    await ctx.request
      .put(`/api/v1/carrito/lineas/${productoId}?contexto=${institucionId}`)
      .set(bearer(encargadoToken))
      .send({ cantidad: 15 });

    const res = await ctx.request
      .post('/api/v1/checkout')
      .set(bearer(encargadoToken))
      .send({
        contexto: institucionId,
        modalidad_envio: 'home_delivery',
        codigo_postal: DOM.codigo_postal,
        domicilio: DOM,
      });
    expect(res.status).toBe(201);

    const orden = await ctx.pg.query('SELECT order_type, institution_id, user_id FROM orders WHERE id = $1', [
      res.body.pedido_id,
    ]);
    expect(orden.rows[0].order_type).toBe('b2b');
    expect(orden.rows[0].institution_id).toBe(institucionId);
  });

  it('A3: docente sin permisos no puede finalizar la compra institucional (404)', async () => {
    await ctx.request
      .put(`/api/v1/carrito/lineas/${productoId}?contexto=${institucionId}`)
      .set(bearer(encargadoToken))
      .send({ cantidad: 3 }); // el carrito institucional es del encargado; esto es solo para tener stock configurado

    const res = await ctx.request
      .post('/api/v1/checkout')
      .set(bearer(docenteSinPermisoToken))
      .send({
        contexto: institucionId,
        modalidad_envio: 'home_delivery',
        codigo_postal: DOM.codigo_postal,
        domicilio: DOM,
      });
    expect(res.status).toBe(404);
  });

  it('el checkout personal (sin contexto) sigue creando order_type=b2c', async () => {
    await ctx.request.put(`/api/v1/carrito/lineas/${productoId}`).set(bearer(encargadoToken)).send({ cantidad: 1 });

    const res = await ctx.request
      .post('/api/v1/checkout')
      .set(bearer(encargadoToken))
      .send({
        modalidad_envio: 'home_delivery',
        codigo_postal: DOM.codigo_postal,
        domicilio: DOM,
      });
    expect(res.status).toBe(201);

    const orden = await ctx.pg.query('SELECT order_type, institution_id FROM orders WHERE id = $1', [
      res.body.pedido_id,
    ]);
    expect(orden.rows[0].order_type).toBe('b2c');
    expect(orden.rows[0].institution_id).toBeNull();
  });
});
