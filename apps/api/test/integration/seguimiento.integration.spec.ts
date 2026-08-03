import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-13 · Seguir Pedido Logístico — contra la app real + PostgreSQL real (Testcontainers).
describe('CU-13 · Seguimiento de pedido (proveedor operativo)', () => {
  let ctx: CtxApp;
  let token: string;
  let userId: string;
  let ordenEnviadaId: string;
  let ordenEntregadaId: string;
  let ordenSinTrackingId: string;
  let ordenNoDespachadaId: string;

  beforeAll(async () => {
    process.env.SHIPPING_ADAPTER = 'micorreo'; // el fake devuelve eventos reales (no lanza)
    ctx = await levantarApp();

    const PW = 'Password123!';
    await ctx.request
      .post('/api/v1/auth/registro')
      .send({ email: 'seguimiento@test.com', contrasena: PW, nombre: 'Test', apellido: 'User' });
    await ctx.pg.query(`UPDATE users SET email_verified = true WHERE email = $1`, ['seguimiento@test.com']);
    const login = await ctx.request.post('/api/v1/auth/sesion').send({ email: 'seguimiento@test.com', contrasena: PW });
    token = login.body.token;
    userId = (await ctx.pg.query(`SELECT id FROM users WHERE email = $1`, ['seguimiento@test.com'])).rows[0].id;

    const crearOrden = async (status: string, trackingCode: string | null) => {
      const r = await ctx.pg.query(
        `INSERT INTO orders (order_number, order_type, user_id, total_amount, status, shipping_method, tracking_code)
         VALUES (gen_random_uuid(), 'b2c', $1, 1000, $2, 'home_delivery', $3) RETURNING id`,
        [userId, status, trackingCode],
      );
      return r.rows[0].id as string;
    };

    ordenEnviadaId = await crearOrden('shipped', 'CA123AR');
    ordenEntregadaId = await crearOrden('delivered', 'CA456AR');
    ordenSinTrackingId = await crearOrden('shipped', null);
    ordenNoDespachadaId = await crearOrden('paid', null);
  });

  afterAll(async () => {
    await ctx?.detener();
  });

  it('sin sesión responde 401', async () => {
    const res = await ctx.request.get(`/api/v1/pedidos/${ordenEnviadaId}/tracking`);
    expect(res.status).toBe(401);
  });

  it('flujo principal: devuelve estado, eventos y datos del proveedor, y los cachea', async () => {
    const res = await ctx.request
      .get(`/api/v1/pedidos/${ordenEnviadaId}/tracking`)
      .set('Cookie', `acalud_sesion=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.estado_actual).toBe('in_transit');
    expect(res.body.eventos.length).toBeGreaterThan(0);
    expect(res.body.fecha_estimada_entrega).toBeDefined();
    expect(res.body.desde_cache).toBe(false);

    const cache = await ctx.pg.query('SELECT * FROM order_tracking_events WHERE order_id = $1', [ordenEnviadaId]);
    expect(cache.rows.length).toBeGreaterThan(0);
  });

  it('RN-003: una segunda consulta inmediata sirve desde caché (mismos eventos)', async () => {
    const res = await ctx.request
      .get(`/api/v1/pedidos/${ordenEnviadaId}/tracking`)
      .set('Cookie', `acalud_sesion=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.desde_cache).toBe(true);
  });

  it('A1: pedido sin tracking_code responde 409', async () => {
    const res = await ctx.request
      .get(`/api/v1/pedidos/${ordenSinTrackingId}/tracking`)
      .set('Cookie', `acalud_sesion=${token}`);
    expect(res.status).toBe(409);
  });

  it('A4: pedido no despachado responde 409', async () => {
    const res = await ctx.request
      .get(`/api/v1/pedidos/${ordenNoDespachadaId}/tracking`)
      .set('Cookie', `acalud_sesion=${token}`);
    expect(res.status).toBe(409);
  });

  it('orden ajena o inexistente responde 404', async () => {
    const res = await ctx.request
      .get('/api/v1/pedidos/dddddddd-dddd-4ddd-8ddd-dddddddddddd/tracking')
      .set('Cookie', `acalud_sesion=${token}`);
    expect(res.status).toBe(404);
  });

  it('pedido ya entregado también admite seguimiento (RN-001)', async () => {
    const res = await ctx.request
      .get(`/api/v1/pedidos/${ordenEntregadaId}/tracking`)
      .set('Cookie', `acalud_sesion=${token}`);
    expect(res.status).toBe(200);
  });
});

describe('CU-13 · Seguimiento de pedido (proveedor sin capacidad de tracking)', () => {
  let ctx: CtxApp;
  let token: string;
  let userId: string;
  let ordenId: string;
  let ordenConCacheId: string;

  beforeAll(async () => {
    process.env.SHIPPING_ADAPTER = 'tabla'; // TarifaLocalFakeAdapter: consultarTracking siempre lanza
    ctx = await levantarApp();

    const PW = 'Password123!';
    await ctx.request
      .post('/api/v1/auth/registro')
      .send({ email: 'seguimiento2@test.com', contrasena: PW, nombre: 'Test', apellido: 'User' });
    await ctx.pg.query(`UPDATE users SET email_verified = true WHERE email = $1`, ['seguimiento2@test.com']);
    const login = await ctx.request.post('/api/v1/auth/sesion').send({ email: 'seguimiento2@test.com', contrasena: PW });
    token = login.body.token;
    userId = (await ctx.pg.query(`SELECT id FROM users WHERE email = $1`, ['seguimiento2@test.com'])).rows[0].id;

    const orden1 = await ctx.pg.query(
      `INSERT INTO orders (order_number, order_type, user_id, total_amount, status, shipping_method, tracking_code)
       VALUES (gen_random_uuid(), 'b2c', $1, 1000, 'shipped', 'home_delivery', 'CA999AR') RETURNING id`,
      [userId],
    );
    ordenId = orden1.rows[0].id;

    const orden2 = await ctx.pg.query(
      `INSERT INTO orders (order_number, order_type, user_id, total_amount, status, shipping_method, tracking_code)
       VALUES (gen_random_uuid(), 'b2c', $1, 1000, 'shipped', 'home_delivery', 'CA888AR') RETURNING id`,
      [userId],
    );
    ordenConCacheId = orden2.rows[0].id;
    // Precarga un estado "último conocido" para simular una consulta previa exitosa (RNF-007).
    await ctx.pg.query(
      `INSERT INTO order_tracking_events (order_id, status, location, description, event_date, fetched_at)
       VALUES ($1, 'in_transit', 'CABA', 'último estado antes de que el proveedor cayera', now() - interval '1 day', now() - interval '1 day')`,
      [ordenConCacheId],
    );
  });

  afterAll(async () => {
    await ctx?.detener();
  });

  it('A3: sin caché previa y proveedor caído responde 503', async () => {
    const res = await ctx.request
      .get(`/api/v1/pedidos/${ordenId}/tracking`)
      .set('Cookie', `acalud_sesion=${token}`);
    expect(res.status).toBe(503);
  });

  it('RNF-007: con caché previa (aunque vencida) y proveedor caído, devuelve el último estado conocido', async () => {
    const res = await ctx.request
      .get(`/api/v1/pedidos/${ordenConCacheId}/tracking`)
      .set('Cookie', `acalud_sesion=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.desde_cache).toBe(true);
    expect(res.body.eventos[0].descripcion).toBe('último estado antes de que el proveedor cayera');
  });
});
