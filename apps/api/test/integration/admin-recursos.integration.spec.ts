import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-19 A9 · Gestión de recursos (ABM) — contra la app real + PostgreSQL real.
describe('CU-19 A9 · ABM de Recursos (admin)', () => {
  let ctx: CtxApp;
  let adminToken: string;
  let docenteToken: string;
  let productoId: string;

  beforeAll(async () => {
    ctx = await levantarApp();

    const PW = 'Password123!';

    const crearUsuario = async (email: string, esAdmin: boolean): Promise<string> => {
      await ctx.request
        .post('/api/v1/auth/registro')
        .send({ email, contrasena: PW, nombre: 'Test', apellido: 'User' });
      await ctx.pg.query(`UPDATE users SET email_verified = true WHERE email = $1`, [email]);
      if (esAdmin) {
        await ctx.pg.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [email]);
      }
      const login = await ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena: PW });
      return login.body.token as string;
    };

    adminToken = await crearUsuario('admin-rec@test.com', true);
    docenteToken = await crearUsuario('docente-rec@test.com', false);

    const producto = await ctx.pg.query(
      `INSERT INTO products (name, price, stock, is_active) VALUES ('Producto con Recurso Test', 100, 10, true) RETURNING id`,
    );
    productoId = producto.rows[0].id;
  });

  afterAll(async () => {
    await ctx?.detener();
  });

  const recursoValido = {
    titulo: 'Guía docente Test',
    tipo: 'pdf' as const,
    url: 'recursos/guia-test.pdf',
    licenciado: false,
    producto_id: null as string | null,
  };

  describe('Autorización (RN-001)', () => {
    it('sin sesión responde 401', async () => {
      const res = await ctx.request.post('/api/v1/admin/resources').send(recursoValido);
      expect(res.status).toBe(401);
    });

    it('autenticado pero sin rol admin responde 403', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/resources')
        .set('Cookie', `acalud_sesion=${docenteToken}`)
        .send(recursoValido);
      expect(res.status).toBe(403);
    });
  });

  describe('Alta de recurso (A9.4-A9.9)', () => {
    it('A9.6: rechaza título vacío con 422', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/resources')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...recursoValido, titulo: '' });
      expect(res.status).toBe(422);
    });

    it('RN-009: rechaza un tipo fuera de pdf/link con 422', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/resources')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...recursoValido, tipo: 'video' });
      expect(res.status).toBe(422);
    });

    it('D-19: crea un recurso SIN producto relacionado (opcional)', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/resources')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send(recursoValido);

      expect(res.status).toBe(201);
      expect(res.body.producto_id).toBeNull();

      const fila = await ctx.pg.query('SELECT * FROM resources WHERE id = $1', [res.body.id]);
      expect(fila.rows[0].product_id).toBeNull();

      const auditoria = await ctx.pg.query(
        `SELECT * FROM audit_log WHERE entity_type = 'resource' AND entity_id = $1 AND action = 'create'`,
        [res.body.id],
      );
      expect(auditoria.rows).toHaveLength(1);
    });

    it('crea un recurso CON producto relacionado', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/resources')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...recursoValido, producto_id: productoId, licenciado: true, tipo: 'link', url: 'https://externo.test/recurso' });

      expect(res.status).toBe(201);
      expect(res.body.producto_id).toBe(productoId);
      expect(res.body.licenciado).toBe(true);
    });

    it('producto relacionado inexistente responde 422', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/resources')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...recursoValido, producto_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' });
      expect(res.status).toBe(422);
    });
  });

  describe('Listado (A9.2)', () => {
    it('lista los recursos existentes', async () => {
      const res = await ctx.request
        .get('/api/v1/admin/resources')
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.some((r: { titulo: string }) => r.titulo === 'Guía docente Test')).toBe(true);
    });
  });

  describe('Edición (A9.3)', () => {
    it('edita un recurso existente', async () => {
      const alta = await ctx.request
        .post('/api/v1/admin/resources')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send(recursoValido);
      const id = alta.body.id as string;

      const res = await ctx.request
        .put(`/api/v1/admin/resources/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...recursoValido, titulo: 'Guía docente Editada', producto_id: productoId });

      expect(res.status).toBe(200);
      expect(res.body.titulo).toBe('Guía docente Editada');
      expect(res.body.producto_id).toBe(productoId);

      const auditoria = await ctx.pg.query(
        `SELECT * FROM audit_log WHERE entity_type = 'resource' AND entity_id = $1 AND action = 'update'`,
        [id],
      );
      expect(auditoria.rows).toHaveLength(1);
    });

    it('editar un recurso inexistente responde 404', async () => {
      const res = await ctx.request
        .put('/api/v1/admin/resources/dddddddd-dddd-4ddd-8ddd-dddddddddddd')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send(recursoValido);
      expect(res.status).toBe(404);
    });
  });

  describe('Baja (A9.3)', () => {
    it('elimina el recurso físicamente', async () => {
      const alta = await ctx.request
        .post('/api/v1/admin/resources')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send(recursoValido);
      const id = alta.body.id as string;

      const res = await ctx.request
        .delete(`/api/v1/admin/resources/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(204);

      const fila = await ctx.pg.query('SELECT * FROM resources WHERE id = $1', [id]);
      expect(fila.rows).toHaveLength(0);

      const auditoria = await ctx.pg.query(
        `SELECT * FROM audit_log WHERE entity_type = 'resource' AND entity_id = $1 AND action = 'delete'`,
        [id],
      );
      expect(auditoria.rows).toHaveLength(1);
    });

    it('eliminar un recurso inexistente responde 404', async () => {
      const res = await ctx.request
        .delete('/api/v1/admin/resources/dddddddd-dddd-4ddd-8ddd-dddddddddddd')
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Subida de PDF (CU-19 A9: para tipo pdf, no una URL/path a mano)', () => {
    it('sin sesión responde 401', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/resources/pdf')
        .attach('archivo', Buffer.from('%PDF-fake'), { filename: 'x.pdf', contentType: 'application/pdf' });
      expect(res.status).toBe(401);
    });

    it('autenticado pero sin rol admin responde 403', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/resources/pdf')
        .set('Cookie', `acalud_sesion=${docenteToken}`)
        .attach('archivo', Buffer.from('%PDF-fake'), { filename: 'x.pdf', contentType: 'application/pdf' });
      expect(res.status).toBe(403);
    });

    it('mimetype inválido (no PDF) responde 422', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/resources/pdf')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .attach('archivo', Buffer.from('no es pdf'), { filename: 'x.png', contentType: 'image/png' });
      expect(res.status).toBe(422);
    });

    it('sube el PDF y devuelve un path interno del bucket recursos', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/resources/pdf')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .attach('archivo', Buffer.from('%PDF-fake-bytes'), { filename: 'guia.pdf', contentType: 'application/pdf' });

      expect(res.status).toBe(201);
      expect(res.body.url).toMatch(/^pdfs\/.+\.pdf$/);
    });

    it('al reemplazar el PDF de un recurso tipo pdf, borra el viejo del bucket', async () => {
      const primero = await ctx.request
        .post('/api/v1/admin/resources/pdf')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .attach('archivo', Buffer.from('pdf-viejo'), { filename: 'viejo.pdf', contentType: 'application/pdf' });
      const pdfViejo = primero.body.url as string;

      const alta = await ctx.request
        .post('/api/v1/admin/resources')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...recursoValido, titulo: 'Recurso Con PDF Test', url: pdfViejo });
      const id = alta.body.id as string;
      expect(ctx.storageMock.has(`recursos/${pdfViejo}`)).toBe(true);

      const segundo = await ctx.request
        .post('/api/v1/admin/resources/pdf')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .attach('archivo', Buffer.from('pdf-nuevo'), { filename: 'nuevo.pdf', contentType: 'application/pdf' });
      const pdfNuevo = segundo.body.url as string;

      const edicion = await ctx.request
        .put(`/api/v1/admin/resources/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...recursoValido, titulo: 'Recurso Con PDF Test', url: pdfNuevo });
      expect(edicion.status).toBe(200);

      expect(ctx.storageMock.has(`recursos/${pdfViejo}`)).toBe(false);
      expect(ctx.storageMock.has(`recursos/${pdfNuevo}`)).toBe(true);
    });

    it('cambiar de tipo link a pdf no intenta borrar nada (el link anterior no era un path nuestro)', async () => {
      const alta = await ctx.request
        .post('/api/v1/admin/resources')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...recursoValido, titulo: 'Recurso Link A PDF Test', tipo: 'link', url: 'https://externo.test/video' });
      const id = alta.body.id as string;

      const subida = await ctx.request
        .post('/api/v1/admin/resources/pdf')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .attach('archivo', Buffer.from('pdf-nuevo-2'), { filename: 'nuevo2.pdf', contentType: 'application/pdf' });
      const pdfNuevo = subida.body.url as string;

      const edicion = await ctx.request
        .put(`/api/v1/admin/resources/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...recursoValido, titulo: 'Recurso Link A PDF Test', tipo: 'pdf', url: pdfNuevo });
      expect(edicion.status).toBe(200);
      expect(ctx.storageMock.has(`recursos/${pdfNuevo}`)).toBe(true);
    });
  });
});
