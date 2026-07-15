import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-010 (carrito) contra la app real + PostgreSQL real (Testcontainers).
const PW = 'correcta-bateria-caballo-grapa';
const JA = 'a0000000-0000-4000-8000-00000000000a'; // publicado, tramos 5→10% / 10→18%, stock 100
const JB = 'b0000000-0000-4000-8000-00000000000b'; // publicado, stock 2, sin tramos
const JC = 'c0000000-0000-4000-8000-00000000000c'; // NO publicado

let ctx: CtxApp;

beforeAll(async () => {
  ctx = await levantarApp();
  await ctx.pg.query(
    `INSERT INTO juegos (id, nombre, precio_lista, stock_actual, publicado) VALUES
       ($1,'Carrito Juego A',10000,100,true),
       ($2,'Carrito Juego B',5000,2,true),
       ($3,'Carrito Juego C',3000,50,false)`,
    [JA, JB, JC],
  );
  await ctx.pg.query(
    `INSERT INTO tramos_descuento (juego_id, cantidad_minima, descuento_pct) VALUES ($1,5,10),($1,10,18)`,
    [JA],
  );
});

afterAll(async () => {
  await ctx?.detener();
});

/** Registra una cuenta nueva y devuelve su token de sesión (Bearer). */
async function sesion(): Promise<string> {
  const email = `${randomUUID()}@escuela.edu.ar`;
  await ctx.request
    .post('/api/v1/auth/registro')
    .send({ email, contrasena: PW, nombre: 'N', apellido: 'A' });
  const r = await ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena: PW });
  return r.body.token as string;
}

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

describe('CU-010 · Carrito', () => {
  it('sin sesión responde 401', async () => {
    expect((await ctx.request.get('/api/v1/carrito')).status).toBe(401);
  });

  it('borde del tramo: cantidad JUSTO igual a cantidad_minima aplica el descuento (server-side)', async () => {
    const t = await sesion();
    const res = await ctx.request.put(`/api/v1/carrito/lineas/${JA}`).set(bearer(t)).send({ cantidad: 5 });
    expect(res.status).toBe(200);
    const linea = res.body.lineas.find((l: { juego_id: string }) => l.juego_id === JA);
    expect(linea.cantidad).toBe(5);
    expect(linea.descuento_pct).toBe(10); // 5 == cantidad_minima → aplica (el <=, no <)
    expect(linea.precio_unitario).toBe(9000); // 10000 × 0,90
    expect(linea.subtotal).toBe(45000);
    expect(res.body.total).toBe(45000);
    expect(res.body.ahorro_total).toBe(5000);
  });

  it('una unidad por debajo del tramo no descuenta', async () => {
    const t = await sesion();
    const res = await ctx.request.put(`/api/v1/carrito/lineas/${JA}`).set(bearer(t)).send({ cantidad: 4 });
    const linea = res.body.lineas.find((l: { juego_id: string }) => l.juego_id === JA);
    expect(linea.descuento_pct).toBe(0);
    expect(res.body.total).toBe(40000);
  });

  it('el PUT es upsert (reemplaza, no suma) y marca disponibilidad según stock', async () => {
    const t = await sesion();
    await ctx.request.put(`/api/v1/carrito/lineas/${JB}`).set(bearer(t)).send({ cantidad: 1 });
    const res = await ctx.request.put(`/api/v1/carrito/lineas/${JB}`).set(bearer(t)).send({ cantidad: 3 });
    const linea = res.body.lineas.find((l: { juego_id: string }) => l.juego_id === JB);
    expect(linea.cantidad).toBe(3); // reemplazó (no quedó en 4)
    expect(linea.disponible).toBe(false); // stock 2 < 3
  });

  it('quitar una línea deja el carrito vacío', async () => {
    const t = await sesion();
    await ctx.request.put(`/api/v1/carrito/lineas/${JA}`).set(bearer(t)).send({ cantidad: 2 });
    const res = await ctx.request.delete(`/api/v1/carrito/lineas/${JA}`).set(bearer(t));
    expect(res.status).toBe(200);
    expect(res.body.lineas).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it('juego no publicado o id mal formado → 404', async () => {
    const t = await sesion();
    expect(
      (await ctx.request.put(`/api/v1/carrito/lineas/${JC}`).set(bearer(t)).send({ cantidad: 1 })).status,
    ).toBe(404);
    expect(
      (await ctx.request.put(`/api/v1/carrito/lineas/no-uuid`).set(bearer(t)).send({ cantidad: 1 })).status,
    ).toBe(404);
  });

  it('cantidad fuera de 1–99 → 422', async () => {
    const t = await sesion();
    expect(
      (await ctx.request.put(`/api/v1/carrito/lineas/${JA}`).set(bearer(t)).send({ cantidad: 0 })).status,
    ).toBe(422);
    expect(
      (await ctx.request.put(`/api/v1/carrito/lineas/${JA}`).set(bearer(t)).send({ cantidad: 100 })).status,
    ).toBe(422);
  });

  it('el carrito está aislado por cuenta (IDOR-safe)', async () => {
    const a = await sesion();
    const b = await sesion();
    await ctx.request.put(`/api/v1/carrito/lineas/${JA}`).set(bearer(a)).send({ cantidad: 7 });
    const carritoB = await ctx.request.get('/api/v1/carrito').set(bearer(b));
    expect(carritoB.body.lineas).toHaveLength(0); // B no ve el carrito de A
  });
});
