import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-006 (read-only) contra la app real + PostgreSQL real (Testcontainers).
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; // publicado, Matemática, con demo/tramo/recursos
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'; // publicado, Lengua, sin stock
const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'; // NO publicado

let ctx: CtxApp;

beforeAll(async () => {
  ctx = await levantarApp();
  // El área de la v1 es ahora la categoría del producto (tabla categories).
  await ctx.pg.query(
    `INSERT INTO categories (name) VALUES ('Matemática'), ('Lengua') ON CONFLICT (name) DO NOTHING`,
  );
  await ctx.pg.query(
    `INSERT INTO products (id, name, category_id, price, weight_grams, stock, description, is_active)
     VALUES
       ($1,'Fracciones Test',(SELECT id FROM categories WHERE name='Matemática'),12500,800,10,'Descripción de prueba de fracciones.',true),
       ($2,'Palabras Test',(SELECT id FROM categories WHERE name='Lengua'),9800,650,0,'Descripción de prueba de palabras.',true),
       ($3,'Borrador Test',(SELECT id FROM categories WHERE name='Matemática'),5000,400,5,'No debería listarse.',false)`,
    [A, B, C],
  );
  await ctx.pg.query(
    `INSERT INTO demos (product_id, config_json) VALUES
       ($1, '{"tipo":"publica","formato":"html5","contenido_ref":"https://embebido.test/publica"}'::jsonb),
       ($2, '{"tipo":"completa","formato":"video","contenido_ref":"https://embebido.test/completa"}'::jsonb)`,
    [A, B],
  );
  await ctx.pg.query(
    `UPDATE products SET wholesale_threshold = 5, wholesale_discount_percent = 10 WHERE id = $1`,
    [A],
  );
  await ctx.pg.query(
    `INSERT INTO resources (product_id, title, is_licensed, url) VALUES
       ($1,'Guía docente',false,'r/guia'), ($1,'Fichas premium',true,'r/fichas')`,
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
    // Anónimo: libre desbloqueado; licenciado bloqueado (con derecho, ver bloque CU-09 abajo).
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

describe('CU-09 · desbloqueo de recursos licenciados en la ficha según el derecho del usuario', () => {
  const PW = 'Password123!';

  /** Registra, verifica e inicia sesión. Devuelve el token y el id del usuario. */
  async function sesionDe(email: string): Promise<{ token: string; userId: string }> {
    await ctx.request
      .post('/api/v1/auth/registro')
      .send({ email, contrasena: PW, nombre: 'Test', apellido: 'Docente' });
    await ctx.pg.query(`UPDATE users SET email_verified = true WHERE email = $1`, [email]);
    const login = await ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena: PW });
    const userId = (await ctx.pg.query(`SELECT id FROM users WHERE email = $1`, [email])).rows[0]
      .id as string;
    return { token: login.body.token as string, userId };
  }

  async function pedidoDe(userId: string, estado: 'paid' | 'pending'): Promise<void> {
    const orden = await ctx.pg.query(
      `INSERT INTO orders (order_number, order_type, user_id, status, shipping_method, total_amount)
       VALUES ($1, 'b2c', $2, $3::order_status, 'home_delivery', 12500) RETURNING id`,
      [`ACA-CU09-${userId.slice(0, 8)}-${estado}`, userId, estado],
    );
    await ctx.pg.query(
      `INSERT INTO order_items (order_id, product_id, product_name_snapshot, quantity, unit_price)
       VALUES ($1, $2, 'Fracciones Test', 1, 12500)`,
      [orden.rows[0].id, A],
    );
  }

  function licenciado(body: { recursos: { tipo: string; desbloqueado: boolean }[] }) {
    return body.recursos.find((r) => r.tipo === 'licenciado');
  }

  it('con sesión pero sin compra: el licenciado sigue bloqueado', async () => {
    const { token } = await sesionDe('ficha-sin-compra@test.com');
    const res = await ctx.request
      .get(`/api/v1/catalogo/juegos/${A}`)
      .set('Cookie', `acalud_sesion=${token}`);
    expect(res.status).toBe(200);
    expect(licenciado(res.body)?.desbloqueado).toBe(false);
  });

  it('con un pedido PENDIENTE (no pagado): el licenciado sigue bloqueado', async () => {
    const { token, userId } = await sesionDe('ficha-pendiente@test.com');
    await pedidoDe(userId, 'pending');
    const res = await ctx.request
      .get(`/api/v1/catalogo/juegos/${A}`)
      .set('Authorization', `Bearer ${token}`);
    expect(licenciado(res.body)?.desbloqueado).toBe(false);
  });

  it('con el juego COMPRADO (pedido pagado): el licenciado se desbloquea (cookie y Bearer)', async () => {
    const { token, userId } = await sesionDe('ficha-comprador@test.com');
    await pedidoDe(userId, 'paid');

    const web = await ctx.request
      .get(`/api/v1/catalogo/juegos/${A}`)
      .set('Cookie', `acalud_sesion=${token}`);
    expect(web.status).toBe(200);
    expect(web.body.recursos.every((r: { desbloqueado: boolean }) => r.desbloqueado)).toBe(true);

    const apk = await ctx.request
      .get(`/api/v1/catalogo/juegos/${A}`)
      .set('Authorization', `Bearer ${token}`);
    expect(licenciado(apk.body)?.desbloqueado).toBe(true);

    // Coherencia ficha ↔ descarga: lo que la ficha desbloquea, la descarga lo autoriza.
    const recursoLic = (
      await ctx.pg.query(`SELECT id FROM resources WHERE product_id = $1 AND is_licensed`, [A])
    ).rows[0].id as string;
    const descarga = await ctx.request
      .post(`/api/v1/catalogo/recursos/${recursoLic}/descarga`)
      .set('Cookie', `acalud_sesion=${token}`);
    expect(descarga.status).toBe(201);
  });

  it('una sesión inválida no rompe la ficha pública: responde 200 como anónimo', async () => {
    const res = await ctx.request
      .get(`/api/v1/catalogo/juegos/${A}`)
      .set('Cookie', 'acalud_sesion=token-que-no-existe');
    expect(res.status).toBe(200);
    expect(licenciado(res.body)?.desbloqueado).toBe(false);
  });
});

describe('CU-006/CU-007 · Contenido de la demo', () => {
  // Regresión: obtenerDemo consultaba `products.status` (columna inexistente), así que la
  // verificación "está publicado" siempre fallaba y estos endpoints devolvían 404 siempre,
  // incluso para un producto activo con demo. Corregido a `is_active`.
  it('demo pública de un producto activo devuelve el contenido embebido', async () => {
    const res = await ctx.request.get(`/api/v1/catalogo/juegos/${A}/demo/publica`);
    expect(res.status).toBe(200);
    expect(res.body.tipo).toBe('publica');
    expect(res.body.urlEmbebido).toBe('https://embebido.test/publica');
  });

  it('demo pública de un producto inactivo responde 404', async () => {
    const res = await ctx.request.get(`/api/v1/catalogo/juegos/${C}/demo/publica`);
    expect(res.status).toBe(404);
  });

  it('demo completa exige autenticación', async () => {
    const res = await ctx.request.get(`/api/v1/catalogo/juegos/${B}/demo/completa`);
    expect(res.status).toBe(401);
  });

  it('demo completa autenticada devuelve el contenido y registra la prueba', async () => {
    const PW = 'Password123!';
    await ctx.request
      .post('/api/v1/auth/registro')
      .send({ email: 'demo-completa@test.com', contrasena: PW, nombre: 'Test', apellido: 'Docente' });
    await ctx.pg.query(`UPDATE users SET email_verified = true WHERE email = $1`, [
      'demo-completa@test.com',
    ]);
    const login = await ctx.request
      .post('/api/v1/auth/sesion')
      .send({ email: 'demo-completa@test.com', contrasena: PW });
    const token = login.body.token as string;
    const userId = (
      await ctx.pg.query(`SELECT id FROM users WHERE email = $1`, ['demo-completa@test.com'])
    ).rows[0].id as string;

    const res = await ctx.request
      .get(`/api/v1/catalogo/juegos/${B}/demo/completa`)
      .set('Cookie', `acalud_sesion=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.tipo).toBe('completa');
    expect(res.body.urlEmbebido).toBe('https://embebido.test/completa');

    const progreso = await ctx.pg.query(
      `SELECT * FROM game_progress WHERE user_id = $1 AND product_id = $2`,
      [userId, B],
    );
    expect(progreso.rows).toHaveLength(1);
  });
});
