import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ProcesarPago } from '../../src/modules/compras/application/procesar-pago';
import { MercadoPagoFakeAdapter } from '../../src/modules/compras/infrastructure/adapters/mercado-pago-fake.adapter';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-24 · Adquirir Lote B2B (unidad 2: checkout institucional — order_type/institution_id;
// unidad 3: sync de institutional_inventories.quantity_purchased al confirmarse el pago, D-32).
describe('CU-24 · Checkout institucional', () => {
  let ctx: CtxApp;
  let procesar: ProcesarPago;
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
    procesar = ctx.app.get(ProcesarPago);

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

  /** Institución + encargado propios, para tests que necesitan un carrito institucional limpio
   *  (sin el pedido pendiente_pago que dejan otros tests sobre el mismo carrito). */
  async function crearInstitucionConEncargado(): Promise<{ institucionId: string; token: string }> {
    const institucion = await ctx.pg.query(
      `INSERT INTO institutions (legal_name, tax_id, email, status)
       VALUES ('Escuela Aislada Test', $1, $2, 'active') RETURNING id`,
      [`30-${randomUUID().slice(0, 8)}`, `${randomUUID()}@escuela.edu.ar`],
    );
    const nuevaInstitucionId = institucion.rows[0].id;

    const email = `${randomUUID()}@escuela.edu.ar`;
    await ctx.request.post('/api/v1/auth/registro').send({ email, contrasena: PW, nombre: 'N', apellido: 'A' });
    const login = await ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena: PW });
    const id = (await ctx.pg.query(`SELECT id FROM users WHERE email = $1`, [email])).rows[0].id;
    await ctx.pg.query(
      `INSERT INTO institutional_teachers (institution_id, user_id, invited_email, is_admin, status, joined_at)
       VALUES ($1, $2, $3, true, 'active', now())`,
      [nuevaInstitucionId, id, email],
    );
    return { institucionId: nuevaInstitucionId, token: login.body.token as string };
  }

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

  it('RN-007: la orden B2B guarda billing_data con la razón social y el CUIT de la institución', async () => {
    // Institución + encargado propios (carrito institucional limpio, sin pisar el pendiente que
    // deja RN-003 sobre el carrito compartido de este describe).
    const aislada = await crearInstitucionConEncargado();
    await ctx.request
      .put(`/api/v1/carrito/lineas/${productoId}?contexto=${aislada.institucionId}`)
      .set(bearer(aislada.token))
      .send({ cantidad: 2 });

    const res = await ctx.request
      .post('/api/v1/checkout')
      .set(bearer(aislada.token))
      .send({
        contexto: aislada.institucionId,
        modalidad_envio: 'home_delivery',
        codigo_postal: DOM.codigo_postal,
        domicilio: DOM,
      });
    expect(res.status).toBe(201);

    const institucion = await ctx.pg.query('SELECT legal_name, tax_id FROM institutions WHERE id = $1', [
      aislada.institucionId,
    ]);
    const orden = await ctx.pg.query('SELECT billing_data FROM orders WHERE id = $1', [res.body.pedido_id]);
    expect(orden.rows[0].billing_data).toEqual({
      razon_social: institucion.rows[0].legal_name,
      cuit: institucion.rows[0].tax_id,
    });
  });

  it('el checkout personal (sin contexto) NO guarda billing_data', async () => {
    // Encargado propio: el carrito personal de `encargadoToken` ya lo usan otros tests de este
    // describe y puede tener un pedido pendiente.
    const aislada = await crearInstitucionConEncargado();
    await ctx.request.put(`/api/v1/carrito/lineas/${productoId}`).set(bearer(aislada.token)).send({ cantidad: 1 });

    const res = await ctx.request
      .post('/api/v1/checkout')
      .set(bearer(aislada.token))
      .send({
        modalidad_envio: 'home_delivery',
        codigo_postal: DOM.codigo_postal,
        domicilio: DOM,
      });
    expect(res.status).toBe(201);

    const orden = await ctx.pg.query('SELECT billing_data FROM orders WHERE id = $1', [res.body.pedido_id]);
    expect(orden.rows[0].billing_data).toBeNull();
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

  it('D-32: al aprobarse el pago B2B, acumula quantity_purchased en institutional_inventories', async () => {
    const aislada = await crearInstitucionConEncargado();

    await ctx.request
      .put(`/api/v1/carrito/lineas/${productoId}?contexto=${aislada.institucionId}`)
      .set(bearer(aislada.token))
      .send({ cantidad: 7 });

    const co = await ctx.request
      .post('/api/v1/checkout')
      .set(bearer(aislada.token))
      .send({
        contexto: aislada.institucionId,
        modalidad_envio: 'home_delivery',
        codigo_postal: DOM.codigo_postal,
        domicilio: DOM,
      });
    expect(co.status).toBe(201);
    const pedidoId = co.body.pedido_id as string;

    // Ninguna fila previa: la institución es nueva.
    const antes = await ctx.pg.query(
      `SELECT quantity_purchased FROM institutional_inventories WHERE institution_id = $1 AND product_id = $2`,
      [aislada.institucionId, productoId],
    );
    expect(antes.rows).toHaveLength(0);

    const resultado = await procesar.ejecutar(MercadoPagoFakeAdapter.paymentIdDe(pedidoId));
    expect(resultado).toBe('paid');

    const despues = await ctx.pg.query(
      `SELECT quantity_purchased FROM institutional_inventories WHERE institution_id = $1 AND product_id = $2`,
      [aislada.institucionId, productoId],
    );
    expect(despues.rows[0].quantity_purchased).toBe(7);

    // Segunda compra del mismo producto: se ACUMULA, no se reemplaza (upsert).
    await ctx.request
      .put(`/api/v1/carrito/lineas/${productoId}?contexto=${aislada.institucionId}`)
      .set(bearer(aislada.token))
      .send({ cantidad: 3 });
    const co2 = await ctx.request
      .post('/api/v1/checkout')
      .set(bearer(aislada.token))
      .send({
        contexto: aislada.institucionId,
        modalidad_envio: 'home_delivery',
        codigo_postal: DOM.codigo_postal,
        domicilio: DOM,
      });
    expect(co2.status).toBe(201);
    await procesar.ejecutar(MercadoPagoFakeAdapter.paymentIdDe(co2.body.pedido_id as string));

    const final = await ctx.pg.query(
      `SELECT quantity_purchased FROM institutional_inventories WHERE institution_id = $1 AND product_id = $2`,
      [aislada.institucionId, productoId],
    );
    expect(final.rows[0].quantity_purchased).toBe(10);
  });

  it('el pago de una compra personal NO crea fila en institutional_inventories', async () => {
    const otroProducto = await ctx.pg.query(
      `INSERT INTO products (name, price, stock, is_active) VALUES ('Producto Personal Test', 500, 50, true) RETURNING id`,
    );
    const otroProductoId = otroProducto.rows[0].id;

    await ctx.request
      .put(`/api/v1/carrito/lineas/${otroProductoId}`)
      .set(bearer(docenteSinPermisoToken))
      .send({ cantidad: 2 });
    const co = await ctx.request
      .post('/api/v1/checkout')
      .set(bearer(docenteSinPermisoToken))
      .send({
        modalidad_envio: 'home_delivery',
        codigo_postal: DOM.codigo_postal,
        domicilio: DOM,
      });
    expect(co.status).toBe(201);
    const pedidoId = co.body.pedido_id as string;

    expect(await procesar.ejecutar(MercadoPagoFakeAdapter.paymentIdDe(pedidoId))).toBe('paid');

    const fila = await ctx.pg.query(
      `SELECT 1 FROM institutional_inventories WHERE institution_id = $1 AND product_id = $2`,
      [institucionId, otroProductoId],
    );
    expect(fila.rows).toHaveLength(0);
  });
});
