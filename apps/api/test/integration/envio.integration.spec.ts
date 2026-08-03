import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-11 · Calcular Costo de Envío — contra la app real + PostgreSQL real (Testcontainers).
describe('CU-11 · Calcular costo de envío (tabla local)', () => {
  let ctx: CtxApp;
  let productoConPesoId: string;
  let productoSinPesoId: string;

  beforeAll(async () => {
    process.env.SHIPPING_ADAPTER = 'tabla'; // TarifaLocalFakeAdapter (default de la factory)
    ctx = await levantarApp();

    const conPeso = await ctx.pg.query<{ id: string }>(
      `INSERT INTO products (name, price, stock, is_active, weight_grams)
       VALUES ('Producto Con Peso Test', 1000, 50, true, 800) RETURNING id`,
    );
    productoConPesoId = conPeso.rows[0]!.id;

    const sinPeso = await ctx.pg.query<{ id: string }>(
      `INSERT INTO products (name, price, stock, is_active) VALUES ('Producto Sin Peso Test', 1000, 50, true) RETURNING id`,
    );
    productoSinPesoId = sinPeso.rows[0]!.id;
  });

  afterAll(async () => {
    await ctx?.detener();
  });

  const calcular = (body: object) => ctx.request.post('/api/v1/shipping/calculate').send(body);

  it('flujo principal (A8: sin sesión): devuelve ambas modalidades con costo, plazo y nombre', async () => {
    const res = await calcular({
      codigo_postal: '1900',
      items: [{ product_id: productoConPesoId, quantity: 2 }],
    });
    expect(res.status).toBe(200);
    expect(res.body.opciones).toHaveLength(2);
    const modalidades = res.body.opciones.map((o: { modalidad: string }) => o.modalidad).sort();
    expect(modalidades).toEqual(['branch_pickup', 'home_delivery']);
    for (const opcion of res.body.opciones) {
      expect(opcion.nombre_servicio).toEqual(expect.any(String));
      expect(opcion.costo).toBeGreaterThan(0);
      expect(opcion.plazo_estimado_dias).toBeGreaterThan(0);
      // Tabla local: sin proveedor externo detrás, sin tracking (mismo criterio que CU-13).
      expect(opcion.tracking_disponible).toBe(false);
    }
    // A7: ordenadas de menor a mayor costo.
    expect(res.body.opciones[0].costo).toBeLessThanOrEqual(res.body.opciones[1].costo);
  });

  it('A5: producto sin weight_grams no bloquea la cotización (usa un peso predeterminado)', async () => {
    const res = await calcular({
      codigo_postal: '1900',
      items: [{ product_id: productoSinPesoId, quantity: 1 }],
    });
    expect(res.status).toBe(200);
    expect(res.body.opciones).toHaveLength(2);
  });

  it('a mayor peso total, mayor costo cotizado', async () => {
    const liviano = await calcular({
      codigo_postal: '1900',
      items: [{ product_id: productoConPesoId, quantity: 1 }],
    });
    const pesado = await calcular({
      codigo_postal: '1900',
      items: [{ product_id: productoConPesoId, quantity: 20 }],
    });
    expect(pesado.body.opciones[0].costo).toBeGreaterThan(liviano.body.opciones[0].costo);
  });

  it('A1: código postal con formato inválido responde 422', async () => {
    const res = await calcular({ codigo_postal: 'ABCDE', items: [{ product_id: productoConPesoId, quantity: 1 }] });
    expect(res.status).toBe(422);
  });

  it('A4: sin ítems responde 422', async () => {
    const res = await calcular({ codigo_postal: '1900', items: [] });
    expect(res.status).toBe(422);
  });

  it('product_id inexistente no rompe la cotización (usa el peso predeterminado)', async () => {
    const res = await calcular({ codigo_postal: '1900', items: [{ product_id: randomUUID(), quantity: 1 }] });
    expect(res.status).toBe(200);
  });
});

describe('CU-11 · Calcular costo de envío (MiCorreo)', () => {
  let ctx: CtxApp;
  let productoId: string;

  beforeAll(async () => {
    process.env.SHIPPING_ADAPTER = 'micorreo';
    ctx = await levantarApp();
    const r = await ctx.pg.query<{ id: string }>(
      `INSERT INTO products (name, price, stock, is_active, weight_grams)
       VALUES ('Producto MiCorreo Test', 1000, 50, true, 500) RETURNING id`,
    );
    productoId = r.rows[0]!.id;
  });

  afterAll(async () => {
    await ctx?.detener();
  });

  it('con MiCorreo, ambas opciones quedan marcadas con tracking disponible', async () => {
    const res = await ctx.request
      .post('/api/v1/shipping/calculate')
      .send({ codigo_postal: '1900', items: [{ product_id: productoId, quantity: 1 }] });
    expect(res.status).toBe(200);
    expect(res.body.opciones.every((o: { tracking_disponible: boolean }) => o.tracking_disponible)).toBe(true);
  });
});
