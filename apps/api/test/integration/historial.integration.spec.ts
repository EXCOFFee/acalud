import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-05 · Ver Historial de Compras + CU-24 RN-009 (historial institucional distinguible).
// No existía ningún test de integración para GET /pedidos — se crea acá antes de tocar la query
// (gap D8 del backlog post-frontend).
describe('GET /pedidos · historial distinguible (order_type/institution_id/billing_data)', () => {
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

  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  beforeAll(async () => {
    ctx = await levantarApp();

    const producto = await ctx.pg.query(
      `INSERT INTO products (name, price, stock, is_active) VALUES ('Producto Historial Test', 1000, 100, true) RETURNING id`,
    );
    productoId = producto.rows[0].id;

    const institucion = await ctx.pg.query(
      `INSERT INTO institutions (legal_name, tax_id, email, status)
       VALUES ('Escuela Historial Test', '30-73333333-3', 'escuela-historial@test.com', 'active') RETURNING id`,
    );
    institucionId = institucion.rows[0].id;
  });

  afterAll(async () => {
    await ctx?.detener();
  });

  /** Encargado nuevo por test: cada uno necesita un carrito personal e institucional propios —
   *  el índice parcial `uq_orders_pending_per_cart` rechaza un segundo checkout sobre el mismo
   *  carrito mientras el primer pedido siga `pending`. */
  async function nuevoEncargado(): Promise<{ token: string }> {
    const email = `${randomUUID()}@escuela.edu.ar`;
    await ctx.request.post('/api/v1/auth/registro').send({ email, contrasena: PW, nombre: 'N', apellido: 'A' });
    const login = await ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena: PW });
    const id = (await ctx.pg.query(`SELECT id FROM users WHERE email = $1`, [email])).rows[0].id;
    await ctx.pg.query(
      `INSERT INTO institutional_teachers (institution_id, user_id, invited_email, is_admin, status, joined_at)
       VALUES ($1, $2, $3, true, 'active', now())`,
      [institucionId, id, email],
    );
    return { token: login.body.token as string };
  }

  async function checkout(token: string, contexto: string | undefined): Promise<string> {
    await ctx.request
      .put(`/api/v1/carrito/lineas/${productoId}${contexto ? `?contexto=${contexto}` : ''}`)
      .set(bearer(token))
      .send({ cantidad: 1 });
    const res = await ctx.request
      .post('/api/v1/checkout')
      .set(bearer(token))
      .send({
        ...(contexto ? { contexto } : {}),
        modalidad_envio: 'home_delivery',
        codigo_postal: DOM.codigo_postal,
        domicilio: DOM,
      });
    expect(res.status).toBe(201);
    return res.body.pedido_id as string;
  }

  it('la lista trae order_type/institution_id correctos para una orden personal y una institucional', async () => {
    const { token } = await nuevoEncargado();
    const personalId = await checkout(token, undefined);
    const b2bId = await checkout(token, institucionId);

    const res = await ctx.request.get('/api/v1/pedidos?limite=100').set(bearer(token));
    expect(res.status).toBe(200);

    const personal = res.body.items.find((o: { id: string }) => o.id === personalId);
    const b2b = res.body.items.find((o: { id: string }) => o.id === b2bId);
    expect(personal.order_type).toBe('b2c');
    expect(personal.institution_id).toBeNull();
    expect(b2b.order_type).toBe('b2b');
    expect(b2b.institution_id).toBe(institucionId);
  });

  it('el filtro order_type=b2b devuelve solo las órdenes institucionales', async () => {
    const { token } = await nuevoEncargado();
    await checkout(token, undefined);
    await checkout(token, institucionId);

    const res = await ctx.request.get('/api/v1/pedidos?order_type=b2b&limite=100').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    for (const item of res.body.items) {
      expect(item.order_type).toBe('b2b');
    }
  });

  it('el detalle de una orden B2B incluye billing_data con la razón social y el CUIT', async () => {
    const { token } = await nuevoEncargado();
    const b2bId = await checkout(token, institucionId);
    const res = await ctx.request.get(`/api/v1/pedidos/${b2bId}`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.order_type).toBe('b2b');
    expect(res.body.institution_id).toBe(institucionId);
    expect(res.body.billing_data).toEqual({ razon_social: 'Escuela Historial Test', cuit: '30-73333333-3' });
  });

  it('el detalle de una orden personal tiene billing_data: null', async () => {
    const { token } = await nuevoEncargado();
    const personalId = await checkout(token, undefined);
    const res = await ctx.request.get(`/api/v1/pedidos/${personalId}`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.order_type).toBe('b2c');
    expect(res.body.billing_data).toBeNull();
  });

  it('sin sesión responde 401', async () => {
    const res = await ctx.request.get('/api/v1/pedidos');
    expect(res.status).toBe(401);
  });

  it('el detalle de una orden ajena responde 404', async () => {
    const { token } = await nuevoEncargado();
    const personalId = await checkout(token, undefined);

    const otro = await nuevoEncargado();
    const res = await ctx.request.get(`/api/v1/pedidos/${personalId}`).set(bearer(otro.token));
    expect(res.status).toBe(404);
  });
});
