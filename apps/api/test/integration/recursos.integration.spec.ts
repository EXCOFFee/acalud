import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

describe('Catálogo: Descarga de Recursos (CU-08 y CU-09)', () => {
  let ctx: CtxApp;
  
  const recursoLibrePdfId = randomUUID();
  const recursoLibreLinkId = randomUUID();
  const recursoLicenciadoId = randomUUID();
  const juegoGratisId = randomUUID();
  const juegoLicenciadoId = randomUUID();

  // Usuarios
  const authDocenteComproId = randomUUID();
  const authDocenteAsignadoId = randomUUID();
  const authDocenteSinPermisoId = randomUUID();
  const instId = randomUUID();

  let profeComproToken: string;
  let profeAsignadoToken: string;
  let profeSinPermisoToken: string;

  beforeAll(async () => {
    ctx = await levantarApp();

    const PW = 'Password123!';

    // Helpers to create teachers
    const createTeacher = async (email: string, id: string) => {
      await ctx.request.post('/api/v1/auth/registro').send({ email, contrasena: PW, nombre: 'Test', apellido: 'Teacher' });
      await ctx.pg.query(`UPDATE users SET email_verified = true WHERE email = $1`, [email]);
      // Update the user ID to match what we need for relationships
      const oldUserRes = await ctx.pg.query(`SELECT id FROM users WHERE email = $1`, [email]);
      const oldId = oldUserRes.rows[0].id;
      // We can't update ID easily due to foreign keys, let's just use the real ID and update our consts
      return { token: (await ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena: PW })).body.token, id: oldId };
    };

    const comproData = await createTeacher('compro@test.com', authDocenteComproId);
    profeComproToken = comproData.token;
    const realComproId = comproData.id;

    const asignadoData = await createTeacher('asignado@test.com', authDocenteAsignadoId);
    profeAsignadoToken = asignadoData.token;
    const realAsignadoId = asignadoData.id;

    const sinPermisoData = await createTeacher('sinpermiso@test.com', authDocenteSinPermisoId);
    profeSinPermisoToken = sinPermisoData.token;

    // Institución
    await ctx.pg.query(`INSERT INTO institutions (id, legal_name, tax_id, email, status) VALUES ($1, 'Inst Test', '30-71000000-1', 'inst@test.com', 'active')`, [instId]);
    await ctx.pg.query(`
      INSERT INTO institutional_teachers (id, institution_id, user_id, invited_email, status) VALUES 
      (gen_random_uuid(), $1, $2, 'asignado@test.com', 'active')
      RETURNING id
    `, [instId, realAsignadoId]);
    const itId = (await ctx.pg.query(`SELECT id FROM institutional_teachers WHERE user_id = $1`, [realAsignadoId])).rows[0].id;

    // Productos
    await ctx.pg.query(`
      INSERT INTO products (id, name, price, stock, is_active) VALUES 
      ($1, 'Juego Gratis', 0, 100, true),
      ($2, 'Juego Premium', 100, 100, true)
    `, [juegoGratisId, juegoLicenciadoId]);

    // Asignar y comprar
    await ctx.pg.query(`
      INSERT INTO orders (order_number, order_type, user_id, total_amount, status, shipping_method) VALUES 
      (gen_random_uuid(), 'b2c', $1, 100, 'paid', 'home_delivery') RETURNING id
    `, [realComproId]);
    const orderId = (await ctx.pg.query(`SELECT id FROM orders WHERE user_id = $1`, [realComproId])).rows[0].id;
    await ctx.pg.query(`INSERT INTO order_items (order_id, product_id, product_name_snapshot, quantity, unit_price) VALUES ($1, $2, 'Juego', 1, 100)`, [orderId, juegoLicenciadoId]);

    await ctx.pg.query(`
      INSERT INTO institutional_assignments (id, institution_id, institutional_teacher_id, product_id, quantity_assigned, status, assigned_by) VALUES 
      (gen_random_uuid(), $1, $2, $3, 1, 'active', $4)
    `, [instId, itId, juegoLicenciadoId, itId]);

    // Recursos
    await ctx.pg.query(`
      INSERT INTO resources (id, product_id, title, is_licensed, type, url, download_count) VALUES 
      ($1, $4, 'Recurso Libre PDF', false, 'pdf', 'pdf-libre.pdf', 0),
      ($2, $4, 'Recurso Libre Link', false, 'link', 'http://externo.com/libre', 0),
      ($3, $5, 'Recurso Licenciado PDF', true, 'pdf', 'pdf-premium.pdf', 0)
    `, [recursoLibrePdfId, recursoLibreLinkId, recursoLicenciadoId, juegoGratisId, juegoLicenciadoId]);
  });

  afterAll(async () => {
    await ctx?.detener();
  });

  it('INS-CU008-HAPPY-001: Descarga anónima de recurso libre (PDF) -> URL firmada', async () => {
    const res = await ctx.request.post(`/api/v1/catalogo/recursos/${recursoLibrePdfId}/descarga`);
    expect(res.status).toBe(201);
    expect(res.body.url_firmada).toBeDefined();
    expect(res.body.url_firmada).not.toBe('pdf-libre.pdf');
    expect(res.body.expira_en).toBeDefined();

    const { rows } = await ctx.pg.query('SELECT download_count FROM resources WHERE id = $1', [recursoLibrePdfId]);
    expect(rows[0].download_count).toBe(1);

    const dl = await ctx.pg.query('SELECT * FROM downloads WHERE resource_id = $1', [recursoLibrePdfId]);
    expect(dl.rows.length).toBe(1);
    expect(dl.rows[0].user_id).toBeNull();
    
    const al = await ctx.pg.query('SELECT * FROM audit_log WHERE entity_id = $1 AND action = $2', [recursoLibrePdfId, 'resource_downloaded']);
    expect(al.rows.length).toBe(1);
  });

  it('INS-CU008-HAPPY-002: Descarga anónima de recurso libre (Link) -> URL externa', async () => {
    const res = await ctx.request.post(`/api/v1/catalogo/recursos/${recursoLibreLinkId}/descarga`);
    expect(res.status).toBe(201);
    expect(res.body.url_firmada).toBe('http://externo.com/libre');
    expect(res.body.expira_en).toBeUndefined();
  });

  it('INS-CU009-EXC-001: Recurso licenciado exige estar autenticado', async () => {
    const res = await ctx.request.post(`/api/v1/catalogo/recursos/${recursoLicenciadoId}/descarga`);
    expect(res.status).toBe(401);
  });

  it('INS-CU009-EXC-002: Recurso licenciado denegado si no se tiene el producto', async () => {
    const res = await ctx.request.post(`/api/v1/catalogo/recursos/${recursoLicenciadoId}/descarga`)
      .set('Cookie', `acalud_sesion=${profeSinPermisoToken}`);
    expect(res.status).toBe(403);
  });

  it('INS-CU009-HAPPY-001: Recurso licenciado permitido por compra directa', async () => {
    const res = await ctx.request.post(`/api/v1/catalogo/recursos/${recursoLicenciadoId}/descarga`)
      .set('Cookie', `acalud_sesion=${profeComproToken}`);
    expect(res.status).toBe(201);
    expect(res.body.url_firmada).toBeDefined();
  });

  it('INS-CU009-HAPPY-002: Recurso licenciado permitido por asignación institucional', async () => {
    const res = await ctx.request.post(`/api/v1/catalogo/recursos/${recursoLicenciadoId}/descarga`)
      .set('Cookie', `acalud_sesion=${profeAsignadoToken}`);
    expect(res.status).toBe(201);
    expect(res.body.url_firmada).toBeDefined();
  });
});
