import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-19 · Gestionar Catálogo (ABM) — solo Productos, contra la app real + PostgreSQL real.
describe('CU-19 · ABM de Productos (admin)', () => {
  let ctx: CtxApp;
  let adminToken: string;
  let docenteToken: string;
  let categoriaId: string;

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

    adminToken = await crearUsuario('admin@test.com', true);
    docenteToken = await crearUsuario('docente@test.com', false);

    const cat = await ctx.pg.query(
      `INSERT INTO categories (name) VALUES ('Ciencias ABM Test') RETURNING id`,
    );
    categoriaId = cat.rows[0].id;
  });

  afterAll(async () => {
    await ctx?.detener();
  });

  const productoValido = {
    titulo: 'Juego Nuevo',
    descripcion: 'Descripción de prueba',
    precio: 1000,
    stock: 20,
    marca_propia: true,
    url_externa: null,
    categoria_id: null,
    umbral_mayorista: null,
    descuento_mayorista_porcentaje: null,
    imagen_url: null,
  };

  describe('Autorización (RN-001)', () => {
    it('sin sesión responde 401', async () => {
      const res = await ctx.request.post('/api/v1/admin/products').send(productoValido);
      expect(res.status).toBe(401);
    });

    it('autenticado pero sin rol admin responde 403', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${docenteToken}`)
        .send(productoValido);
      expect(res.status).toBe(403);
    });
  });

  describe('Alta de producto (flujo principal + A3/A4/A5)', () => {
    it('A3: rechaza título vacío con 422', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, titulo: '' });
      expect(res.status).toBe(422);
    });

    it('RN-006: rechaza precio negativo con 422', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, precio: -1 });
      expect(res.status).toBe(422);
    });

    it('A4/RN-003: producto de terceros sin url_externa responde 422', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, marca_propia: false, url_externa: null });
      expect(res.status).toBe(422);
    });

    it('RN-004: producto propio con url_externa responde 422', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, marca_propia: true, url_externa: 'https://externo.com/x' });
      expect(res.status).toBe(422);
    });

    it('A5/RN-005: umbral mayorista sin porcentaje responde 422', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, umbral_mayorista: 5, descuento_mayorista_porcentaje: null });
      expect(res.status).toBe(422);
    });

    it('categoría inexistente responde 422', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, categoria_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' });
      expect(res.status).toBe(422);
    });

    it('crea el producto, lo activa y registra la auditoría (p9-p18)', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, categoria_id: categoriaId, precio: 2500, stock: 15 });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.titulo).toBe('Juego Nuevo');
      expect(res.body.activo).toBe(true);

      const fila = await ctx.pg.query('SELECT * FROM products WHERE id = $1', [res.body.id]);
      expect(fila.rows[0].is_active).toBe(true);
      expect(Number(fila.rows[0].price)).toBe(2500);

      const auditoria = await ctx.pg.query(
        `SELECT * FROM audit_log WHERE entity_type = 'product' AND entity_id = $1 AND action = 'create'`,
        [res.body.id],
      );
      expect(auditoria.rows).toHaveLength(1);
      expect(auditoria.rows[0].actor_user_id).not.toBeNull();
    });
  });

  describe('Subida de imagen (CU-19: "subida de archivo", no URL a mano)', () => {
    it('sin sesión responde 401', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/products/imagen')
        .attach('archivo', Buffer.from('fake-png'), { filename: 'x.png', contentType: 'image/png' });
      expect(res.status).toBe(401);
    });

    it('autenticado pero sin rol admin responde 403', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/products/imagen')
        .set('Cookie', `acalud_sesion=${docenteToken}`)
        .attach('archivo', Buffer.from('fake-png'), { filename: 'x.png', contentType: 'image/png' });
      expect(res.status).toBe(403);
    });

    it('mimetype inválido responde 422', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/products/imagen')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .attach('archivo', Buffer.from('no-es-una-imagen'), { filename: 'x.txt', contentType: 'text/plain' });
      expect(res.status).toBe(422);
    });

    it('sube la imagen y devuelve una URL pública del bucket productos', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/products/imagen')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .attach('archivo', Buffer.from('fake-png-bytes'), { filename: 'foto.png', contentType: 'image/png' });

      expect(res.status).toBe(201);
      expect(res.body.imagen_url).toContain('mock-storage.com/productos/');
    });

    it('al reemplazar la imagen de un producto, borra la vieja del bucket', async () => {
      const primera = await ctx.request
        .post('/api/v1/admin/products/imagen')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .attach('archivo', Buffer.from('imagen-vieja'), { filename: 'vieja.png', contentType: 'image/png' });
      const imagenVieja = primera.body.imagen_url as string;

      const alta = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, titulo: 'Producto Con Imagen Test', imagen_url: imagenVieja });
      const id = alta.body.id as string;
      expect(ctx.storageMock.has(`productos/${imagenVieja.split('/').pop()}`)).toBe(true);

      const segunda = await ctx.request
        .post('/api/v1/admin/products/imagen')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .attach('archivo', Buffer.from('imagen-nueva'), { filename: 'nueva.png', contentType: 'image/png' });
      const imagenNueva = segunda.body.imagen_url as string;

      const edicion = await ctx.request
        .put(`/api/v1/admin/products/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, titulo: 'Producto Con Imagen Test', imagen_url: imagenNueva });
      expect(edicion.status).toBe(200);

      expect(ctx.storageMock.has(`productos/${imagenVieja.split('/').pop()}`)).toBe(false);
      expect(ctx.storageMock.has(`productos/${imagenNueva.split('/').pop()}`)).toBe(true);
    });

    it('reemplazar una imagen propia por una URL externa pegada a mano sí borra la vieja', async () => {
      const subida = await ctx.request
        .post('/api/v1/admin/products/imagen')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .attach('archivo', Buffer.from('imagen-propia'), { filename: 'propia.png', contentType: 'image/png' });
      const imagenPropia = subida.body.imagen_url as string;

      const alta = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, titulo: 'Producto URL Externa Test', imagen_url: imagenPropia });
      const id = alta.body.id as string;

      // La imagen anterior era nuestra (subida por este mismo endpoint): al reemplazarla
      // por una URL externa pegada a mano, igual se borra del bucket (RN: no dejar huérfanos).
      const edicion = await ctx.request
        .put(`/api/v1/admin/products/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, titulo: 'Producto URL Externa Test', imagen_url: 'https://externo.com/otra.png' });
      expect(edicion.status).toBe(200);
      expect(ctx.storageMock.has(`productos/${imagenPropia.split('/').pop()}`)).toBe(false);
    });

    it('reemplazar una URL externa por otra no intenta borrar nada del bucket', async () => {
      const alta = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, titulo: 'Producto URL Externa Test 2', imagen_url: 'https://externo.com/original.png' });
      const id = alta.body.id as string;

      const tamanioPrevio = ctx.storageMock.size;

      // La imagen anterior NUNCA fue nuestra (URL externa pegada a mano): no debe intentar
      // borrar nada del bucket ni fallar al no encontrar un path propio.
      const edicion = await ctx.request
        .put(`/api/v1/admin/products/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, titulo: 'Producto URL Externa Test 2', imagen_url: 'https://externo.com/otra.png' });
      expect(edicion.status).toBe(200);
      expect(ctx.storageMock.size).toBe(tamanioPrevio);
    });
  });

  describe('Detalle de producto (A1: precarga del formulario de edición)', () => {
    it('devuelve todos los campos del producto, no solo el resumen del listado', async () => {
      const alta = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({
          ...productoValido,
          titulo: 'Producto Detalle Test',
          descripcion: 'Descripción completa de prueba',
          categoria_id: categoriaId,
          imagen_url: 'https://ejemplo.com/img.png',
        });
      const id = alta.body.id as string;

      const res = await ctx.request
        .get(`/api/v1/admin/products/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(id);
      expect(res.body.titulo).toBe('Producto Detalle Test');
      expect(res.body.descripcion).toBe('Descripción completa de prueba');
      expect(res.body.categoria_id).toBe(categoriaId);
      expect(res.body.imagen_url).toBe('https://ejemplo.com/img.png');
      expect(res.body.marca_propia).toBe(true);
      expect(res.body.activo).toBe(true);
    });

    it('producto inexistente responde 404', async () => {
      const res = await ctx.request
        .get('/api/v1/admin/products/dddddddd-dddd-4ddd-8ddd-dddddddddddd')
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(404);
    });

    it('sin rol admin responde 403', async () => {
      const alta = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send(productoValido);

      const res = await ctx.request
        .get(`/api/v1/admin/products/${alta.body.id}`)
        .set('Cookie', `acalud_sesion=${docenteToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Edición de producto (A1)', () => {
    it('edita un producto existente', async () => {
      const alta = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send(productoValido);
      const id = alta.body.id as string;

      const res = await ctx.request
        .put(`/api/v1/admin/products/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, stock: 999 });

      expect(res.status).toBe(200);
      expect(res.body.stock).toBe(999);

      const auditoria = await ctx.pg.query(
        `SELECT * FROM audit_log WHERE entity_type = 'product' AND entity_id = $1 AND action = 'update'`,
        [id],
      );
      expect(auditoria.rows).toHaveLength(1);
    });

    it('editar un producto inexistente responde 404', async () => {
      const res = await ctx.request
        .put('/api/v1/admin/products/dddddddd-dddd-4ddd-8ddd-dddddddddddd')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send(productoValido);
      expect(res.status).toBe(404);
    });
  });

  describe('Baja lógica de producto (A2/RNF-008)', () => {
    it('desactiva el producto sin borrarlo físicamente y dispara auditoría', async () => {
      const alta = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send(productoValido);
      const id = alta.body.id as string;

      const res = await ctx.request
        .delete(`/api/v1/admin/products/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.activo).toBe(false);

      const fila = await ctx.pg.query('SELECT is_active FROM products WHERE id = $1', [id]);
      expect(fila.rows).toHaveLength(1); // sigue existiendo la fila: baja lógica, no física
      expect(fila.rows[0].is_active).toBe(false);

      const auditoria = await ctx.pg.query(
        `SELECT * FROM audit_log WHERE entity_type = 'product' AND entity_id = $1 AND action = 'delete'`,
        [id],
      );
      expect(auditoria.rows).toHaveLength(1);

      // El catálogo público ya no lo lista (is_active = false).
      const publico = await ctx.request.get('/api/v1/catalogo/juegos');
      const ids = publico.body.datos.map((j: { id: string }) => j.id);
      expect(ids).not.toContain(id);
    });

    it('desactivar un producto inexistente responde 404', async () => {
      const res = await ctx.request
        .delete('/api/v1/admin/products/dddddddd-dddd-4ddd-8ddd-dddddddddddd')
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Reactivación de producto (F2, inverso de la baja lógica)', () => {
    it('reactiva un producto desactivado, audita y vuelve a listarse en el catálogo público', async () => {
      const alta = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send(productoValido);
      const id = alta.body.id as string;

      await ctx.request.delete(`/api/v1/admin/products/${id}`).set('Cookie', `acalud_sesion=${adminToken}`);
      const previo = await ctx.request.get('/api/v1/catalogo/juegos');
      expect(previo.body.datos.map((j: { id: string }) => j.id)).not.toContain(id);

      const res = await ctx.request
        .post(`/api/v1/admin/products/${id}/reactivar`)
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(201);
      expect(res.body.activo).toBe(true);

      const fila = await ctx.pg.query('SELECT is_active FROM products WHERE id = $1', [id]);
      expect(fila.rows[0].is_active).toBe(true);

      const auditoria = await ctx.pg.query(
        `SELECT * FROM audit_log WHERE entity_type = 'product' AND entity_id = $1 AND action = 'reactivate'`,
        [id],
      );
      expect(auditoria.rows).toHaveLength(1);

      const publico = await ctx.request.get('/api/v1/catalogo/juegos');
      expect(publico.body.datos.map((j: { id: string }) => j.id)).toContain(id);
    });

    it('reactivar un producto ya activo es idempotente', async () => {
      const alta = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send(productoValido);
      const id = alta.body.id as string;

      const res = await ctx.request
        .post(`/api/v1/admin/products/${id}/reactivar`)
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(201);
      expect(res.body.activo).toBe(true);
    });

    it('reactivar un producto inexistente responde 404', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/products/dddddddd-dddd-4ddd-8ddd-dddddddddddd/reactivar')
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Listado admin (p4)', () => {
    it('incluye productos inactivos, a diferencia del catálogo público', async () => {
      const alta = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, titulo: 'Producto Listado Test' });
      const id = alta.body.id as string;
      await ctx.request
        .delete(`/api/v1/admin/products/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`);

      const res = await ctx.request
        .get('/api/v1/admin/products?q=Producto Listado Test')
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(200);
      const fila = res.body.datos.find((p: { id: string }) => p.id === id);
      expect(fila).toBeDefined();
      expect(fila.activo).toBe(false);
      expect(fila.tiene_demo).toBe(false);
      expect(res.body.paginacion.total).toBeGreaterThanOrEqual(1);
    });

    it('sin rol admin responde 403', async () => {
      const res = await ctx.request
        .get('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${docenteToken}`);
      expect(res.status).toBe(403);
    });

    it('CU-22 A8: expone la config mayorista en el listado ("Umbral X - Descuento Y%" o null)', async () => {
      const conConfig = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({
          ...productoValido,
          titulo: 'Producto Mayorista Test',
          umbral_mayorista: 10,
          descuento_mayorista_porcentaje: 15,
        });
      const sinConfig = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, titulo: 'Producto Sin Mayorista Test' });

      const res = await ctx.request
        .get('/api/v1/admin/products?q=Producto Mayorista Test')
        .set('Cookie', `acalud_sesion=${adminToken}`);
      const fila = res.body.datos.find((p: { id: string }) => p.id === conConfig.body.id);
      expect(fila.umbral_mayorista).toBe(10);
      expect(fila.descuento_mayorista_porcentaje).toBe(15);

      const res2 = await ctx.request
        .get('/api/v1/admin/products?q=Producto Sin Mayorista Test')
        .set('Cookie', `acalud_sesion=${adminToken}`);
      const fila2 = res2.body.datos.find((p: { id: string }) => p.id === sinConfig.body.id);
      expect(fila2.umbral_mayorista).toBeNull();
      expect(fila2.descuento_mayorista_porcentaje).toBeNull();
    });

    it('CU-22 A11: marca tiene_ordenes cuando el producto ya tiene compras asociadas', async () => {
      const alta = await ctx.request
        .post('/api/v1/admin/products')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, titulo: 'Producto Con Ordenes Test' });
      const productoId = alta.body.id as string;

      const orden = await ctx.pg.query<{ id: string }>(
        `INSERT INTO orders (order_number, order_type, user_id, status, shipping_method, total_amount)
         VALUES ($1, 'b2c', (SELECT id FROM users WHERE email = 'admin@test.com'), 'paid', 'home_delivery', 1000)
         RETURNING id`,
        [`ACA-TEST-${productoId.slice(0, 8)}`],
      );
      await ctx.pg.query(
        `INSERT INTO order_items (order_id, product_id, product_name_snapshot, quantity, unit_price)
         VALUES ($1, $2, 'Producto Con Ordenes Test', 1, 1000)`,
        [orden.rows[0]!.id, productoId],
      );

      const res = await ctx.request
        .get('/api/v1/admin/products?q=Producto Con Ordenes Test')
        .set('Cookie', `acalud_sesion=${adminToken}`);
      const fila = res.body.datos.find((p: { id: string }) => p.id === productoId);
      expect(fila.tiene_ordenes).toBe(true);

      // Actualizar la config mayorista de un producto con órdenes no debe fallar (RN-007: la
      // advertencia es informativa, no bloqueante; las órdenes existentes quedan intactas por
      // el snapshot de order_items, ya cubierto en checkout.integration.spec.ts).
      const edicion = await ctx.request
        .put(`/api/v1/admin/products/${productoId}`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...productoValido, titulo: 'Producto Con Ordenes Test', umbral_mayorista: 5, descuento_mayorista_porcentaje: 10 });
      expect(edicion.status).toBe(200);
    });
  });
});
