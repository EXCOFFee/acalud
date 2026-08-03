import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-24 · Adquirir Lote B2B (unidad 1: autorización + carrito institucional separado del personal).
describe('CU-24 · Carrito institucional', () => {
  let ctx: CtxApp;
  const PW = 'correcta-bateria-caballo-grapa';
  let productoId: string;
  let institucionId: string;
  let encargadoToken: string;
  let encargadoId: string;
  let docenteSinPermisoToken: string;
  let docenteAjenoToken: string; // ni siquiera vinculado a la institución

  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  const crearUsuario = async (): Promise<{ token: string; id: string }> => {
    const email = `${randomUUID()}@escuela.edu.ar`;
    await ctx.request.post('/api/v1/auth/registro').send({ email, contrasena: PW, nombre: 'N', apellido: 'A' });
    const login = await ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena: PW });
    const id = (await ctx.pg.query(`SELECT id FROM users WHERE email = $1`, [email])).rows[0].id;
    return { token: login.body.token as string, id };
  };

  beforeAll(async () => {
    ctx = await levantarApp();

    const producto = await ctx.pg.query(
      `INSERT INTO products (name, price, stock, is_active) VALUES ('Producto B2B Test', 1000, 100, true) RETURNING id`,
    );
    productoId = producto.rows[0].id;

    const institucion = await ctx.pg.query(
      `INSERT INTO institutions (legal_name, tax_id, email, status)
       VALUES ('Escuela Test B2B', '30-71111111-1', 'escuela-b2b@test.com', 'active') RETURNING id`,
    );
    institucionId = institucion.rows[0].id;

    const encargado = await crearUsuario();
    encargadoToken = encargado.token;
    encargadoId = encargado.id;
    await ctx.pg.query(
      `INSERT INTO institutional_teachers (institution_id, user_id, invited_email, is_admin, status, joined_at)
       VALUES ($1, $2, 'encargado@test.com', true, 'active', now())`,
      [institucionId, encargadoId],
    );

    const docenteSinPermiso = await crearUsuario();
    docenteSinPermisoToken = docenteSinPermiso.token;
    await ctx.pg.query(
      `INSERT INTO institutional_teachers (institution_id, user_id, invited_email, is_admin, status, joined_at)
       VALUES ($1, $2, 'docente@test.com', false, 'active', now())`,
      [institucionId, docenteSinPermiso.id],
    );

    docenteAjenoToken = (await crearUsuario()).token;
  });

  afterAll(async () => {
    await ctx?.detener();
  });

  describe('Autorización (RN-001/A1/A3)', () => {
    it('A3: docente vinculado pero sin is_admin no puede ver el carrito institucional (404)', async () => {
      const res = await ctx.request
        .get(`/api/v1/carrito?contexto=${institucionId}`)
        .set(bearer(docenteSinPermisoToken));
      expect(res.status).toBe(404);
    });

    it('A1: usuario sin ningún vínculo a la institución responde 404', async () => {
      const res = await ctx.request
        .get(`/api/v1/carrito?contexto=${institucionId}`)
        .set(bearer(docenteAjenoToken));
      expect(res.status).toBe(404);
    });

    it('A3: docente sin permisos no puede agregar líneas al carrito institucional', async () => {
      const res = await ctx.request
        .put(`/api/v1/carrito/lineas/${productoId}?contexto=${institucionId}`)
        .set(bearer(docenteSinPermisoToken))
        .send({ cantidad: 5 });
      expect(res.status).toBe(404);
    });

    it('contexto con institution_id inexistente responde 404 (el encargado no lo es de esa)', async () => {
      const res = await ctx.request
        .get(`/api/v1/carrito?contexto=${randomUUID()}`)
        .set(bearer(encargadoToken));
      expect(res.status).toBe(404);
    });
  });

  describe('Flujo principal: carrito institucional separado del personal', () => {
    it('el encargado ve su carrito institucional vacío inicialmente', async () => {
      const res = await ctx.request
        .get(`/api/v1/carrito?contexto=${institucionId}`)
        .set(bearer(encargadoToken));
      expect(res.status).toBe(200);
      expect(res.body.lineas).toHaveLength(0);
    });

    it('agrega una línea al carrito institucional', async () => {
      const res = await ctx.request
        .put(`/api/v1/carrito/lineas/${productoId}?contexto=${institucionId}`)
        .set(bearer(encargadoToken))
        .send({ cantidad: 20 });
      expect(res.status).toBe(200);
      expect(res.body.lineas).toHaveLength(1);
      expect(res.body.lineas[0].cantidad).toBe(20);
    });

    it('RNF-003: el carrito institucional está separado del personal del mismo usuario', async () => {
      // El mismo encargado agrega algo distinto a su carrito PERSONAL.
      await ctx.request.put(`/api/v1/carrito/lineas/${productoId}`).set(bearer(encargadoToken)).send({ cantidad: 2 });

      const institucional = await ctx.request
        .get(`/api/v1/carrito?contexto=${institucionId}`)
        .set(bearer(encargadoToken));
      const personal = await ctx.request.get('/api/v1/carrito').set(bearer(encargadoToken));

      expect(institucional.body.lineas[0].cantidad).toBe(20); // no se pisó
      expect(personal.body.lineas[0].cantidad).toBe(2);
    });

    it('quita una línea del carrito institucional', async () => {
      const res = await ctx.request
        .delete(`/api/v1/carrito/lineas/${productoId}?contexto=${institucionId}`)
        .set(bearer(encargadoToken));
      expect(res.status).toBe(200);
      expect(res.body.lineas).toHaveLength(0);
    });
  });
});
