import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-006 (read-only) contra la app real + PostgreSQL real (Testcontainers).
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; // publicado, Matemática, con demo/tramo/recursos
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'; // publicado, Lengua, sin stock
const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'; // NO publicado

let ctx: CtxApp;

beforeAll(async () => {
  ctx = await levantarApp();
  await ctx.pg.query(
    `INSERT INTO juegos (id, nombre, area, edad_objetivo, precio_lista, peso_gramos, stock_actual, descripcion, publicado)
     VALUES
       ($1,'Fracciones Test','Matemática','8 a 12 años',12500,800,10,'Descripción de prueba de fracciones.',true),
       ($2,'Palabras Test','Lengua','6 a 9 años',9800,650,0,'Descripción de prueba de palabras.',true),
       ($3,'Borrador Test','Matemática','7 a 11 años',5000,400,5,'No debería listarse.',false)`,
    [A, B, C],
  );
  await ctx.pg.query(
    `INSERT INTO demos (juego_id, tipo, formato, contenido_ref) VALUES ($1,'publica','html5','demos/x')`,
    [A],
  );
  await ctx.pg.query(
    `INSERT INTO tramos_descuento (juego_id, cantidad_minima, descuento_pct) VALUES ($1,5,10)`,
    [A],
  );
  await ctx.pg.query(
    `INSERT INTO recursos (juego_id, nombre, tipo, archivo_ref) VALUES
       ($1,'Guía docente','libre','r/guia'), ($1,'Fichas premium','licenciado','r/fichas')`,
    [A],
  );
});

afterAll(async () => {
  await ctx?.detener();
});

describe('CU-006 · Catálogo (listado)', () => {
  it('lista solo juegos publicados con la forma JuegoResumen', async () => {
    const res = await ctx.request.get('/api/v1/catalogo/juegos');
    expect(res.status).toBe(200);
    const ids = res.body.datos.map((j: { id: string }) => j.id);
    expect(ids).toContain(A);
    expect(ids).toContain(B);
    expect(ids).not.toContain(C); // borrador no se lista

    const a = res.body.datos.find((j: { id: string }) => j.id === A);
    expect(a.nombre).toBe('Fracciones Test');
    expect(typeof a.precio_lista).toBe('number');
    expect(a.tiene_demo_publica).toBe(true);
    expect(a.stock_disponible).toBeUndefined(); // el resumen no expone stock
    expect(res.body.paginacion.total).toBeGreaterThanOrEqual(2);
  });

  it('filtra por área', async () => {
    const res = await ctx.request.get('/api/v1/catalogo/juegos?area=Lengua');
    expect(res.status).toBe(200);
    const ids = res.body.datos.map((j: { id: string }) => j.id);
    expect(ids).toContain(B);
    expect(ids).not.toContain(A);
  });

  it('busca por texto (q)', async () => {
    const res = await ctx.request.get('/api/v1/catalogo/juegos?q=Fracciones');
    expect(res.status).toBe(200);
    const ids = res.body.datos.map((j: { id: string }) => j.id);
    expect(ids).toEqual([A]);
  });
});

describe('CU-006 · Catálogo (ficha)', () => {
  it('devuelve la ficha completa (stock booleano, demos, tramos, recursos)', async () => {
    const res = await ctx.request.get(`/api/v1/catalogo/juegos/${A}`);
    expect(res.status).toBe(200);
    expect(res.body.descripcion).toContain('fracciones');
    expect(res.body.stock_disponible).toBe(true);
    expect(res.body.demos).toHaveLength(1);
    expect(res.body.tramos).toEqual([{ cantidad_minima: 5, descuento_pct: 10 }]);
    // Recurso libre desbloqueado; licenciado bloqueado (derecho real = Etapa 2).
    const libre = res.body.recursos.find((r: { tipo: string }) => r.tipo === 'libre');
    const lic = res.body.recursos.find((r: { tipo: string }) => r.tipo === 'licenciado');
    expect(libre.desbloqueado).toBe(true);
    expect(lic.desbloqueado).toBe(false);
  });

  it('stock_disponible es false cuando no hay stock', async () => {
    const res = await ctx.request.get(`/api/v1/catalogo/juegos/${B}`);
    expect(res.status).toBe(200);
    expect(res.body.stock_disponible).toBe(false);
  });

  it('un juego no publicado responde 404', async () => {
    const res = await ctx.request.get(`/api/v1/catalogo/juegos/${C}`);
    expect(res.status).toBe(404);
  });

  it('un id inexistente o mal formado responde 404 (no 500)', async () => {
    expect((await ctx.request.get('/api/v1/catalogo/juegos/dddddddd-dddd-4ddd-8ddd-dddddddddddd')).status).toBe(404);
    expect((await ctx.request.get('/api/v1/catalogo/juegos/no-es-uuid')).status).toBe(404);
  });
});
