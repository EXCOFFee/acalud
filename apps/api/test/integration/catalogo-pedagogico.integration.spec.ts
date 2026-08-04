import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// Bloque E · Catálogo público de niveles/materias — sin esto no hay de dónde armar los
// selectores de /encuestas, /propuestas y /admin/encuestas.
describe('Catálogo público de niveles/materias (Bloque E)', () => {
  let ctx: CtxApp;

  beforeAll(async () => {
    ctx = await levantarApp();
  });

  afterAll(async () => {
    await ctx?.detener();
  });

  it('GET /levels devuelve los 3 niveles semilla, sin sesión y ordenados por nombre', async () => {
    const res = await ctx.request.get('/api/v1/levels');
    expect(res.status).toBe(200);
    expect(res.body.map((n: { nombre: string }) => n.nombre)).toEqual(['Inicial', 'Primaria', 'Secundaria']);
    for (const nivel of res.body) {
      expect(typeof nivel.id).toBe('string');
      expect(typeof nivel.nombre).toBe('string');
    }
  });

  it('GET /subjects devuelve las 9 materias semilla, sin sesión', async () => {
    const res = await ctx.request.get('/api/v1/subjects');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(9);
    const nombres = res.body.map((m: { nombre: string }) => m.nombre);
    // Orden por nombre delegado a la collation de Postgres (varía según locale del server) — el
    // test verifica el conjunto, no una secuencia exacta de caracteres acentuados.
    expect(new Set(nombres)).toEqual(
      new Set([
        'Matemática',
        'Lengua',
        'Ciencias Naturales',
        'Ciencias Sociales',
        'Programación',
        'Educación Física',
        'Arte',
        'Música',
        'Inglés',
      ]),
    );
  });
});
