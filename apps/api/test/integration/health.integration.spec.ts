import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// Health y readiness (ADR-005) contra la app real + PostgreSQL real (Testcontainers).
let ctx: CtxApp;

beforeAll(async () => {
  ctx = await levantarApp();
});

afterAll(async () => {
  await ctx?.detener();
});

describe('Salud del servicio (ADR-005)', () => {
  it('GET /health responde 200 (liveness, sin dependencias)', async () => {
    const res = await ctx.request.get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /ready toca la BD (SELECT 1) y responde 200 con db ok', async () => {
    const res = await ctx.request.get('/api/v1/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.dependencias.db).toBe('ok');
  });
});
