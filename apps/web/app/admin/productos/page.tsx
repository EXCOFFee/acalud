'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alerta,
  Boton,
  Campo,
  Dialogo,
  EstadoCarga,
  EstadoError,
  EstadoVacio,
  IconoDado,
  Insignia,
  Paginacion,
  Selector,
  SubirArchivo,
  Tabla,
  useToast,
  type ColumnaTabla,
} from '@/components/ui';
import { precioARS, SiteNav } from '@/components/site-nav';
import {
  api,
  ApiError,
  type CategoriaAdmin,
  type FormatoDemo,
  type ProductoAdminInput,
  type ProductoAdminResumen,
  type PaginaProductosAdmin,
  type TipoDemo,
} from '@/lib/api';

const TAMANIO_PAGINA = 20;

const FORM_DEMO_VACIO = {
  tipo: 'publica' as TipoDemo,
  formato: 'html5' as FormatoDemo,
  contenidoRef: '',
  urlUnityWebgl: '',
};

const FORM_VACIO = {
  titulo: '',
  descripcion: '',
  precio: '',
  stock: '',
  marcaPropia: 'propio' as 'propio' | 'terceros',
  urlExterna: '',
  categoriaId: '',
  configurarDescuento: false,
  umbralMayorista: '',
  descuentoPct: '',
  imagenUrl: '',
};

type FormState = typeof FORM_VACIO;

export default function AdminProductosPage() {
  const router = useRouter();
  const { notificar } = useToast();
  const [esAdmin, setEsAdmin] = useState<boolean | null>(null);
  const [categorias, setCategorias] = useState<CategoriaAdmin[]>([]);

  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<PaginaProductosAdmin | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  const [productoId, setProductoId] = useState<string | 'nuevo' | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [avisoOrdenes, setAvisoOrdenes] = useState(false);
  const [formEstado, setFormEstado] = useState<'cargando' | 'ok'>('ok');
  const [formError, setFormError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [aDesactivar, setADesactivar] = useState<ProductoAdminResumen | null>(null);
  const [desactivando, setDesactivando] = useState(false);
  const [reactivandoId, setReactivandoId] = useState<string | null>(null);

  // CU-19 A8 (F3): configurar la demo del producto — un producto, a lo sumo una demo.
  const [demoProducto, setDemoProducto] = useState<ProductoAdminResumen | null>(null);
  const [formDemo, setFormDemo] = useState(FORM_DEMO_VACIO);
  const [demoEstado, setDemoEstado] = useState<'cargando' | 'ok'>('ok');
  const [demoError, setDemoError] = useState<string | null>(null);
  const [guardandoDemo, setGuardandoDemo] = useState(false);

  function cargar(): void {
    setEstado('cargando');
    api
      .listarProductosAdmin({ q: q || undefined, pagina, tamanio: TAMANIO_PAGINA })
      .then((r) => {
        setResultado(r);
        setEstado('ok');
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/admin/productos');
        else setEstado('error');
      });
  }

  useEffect(() => {
    api
      .me()
      .then((p) => {
        setEsAdmin(p.es_admin);
        if (p.es_admin) api.listarCategoriasAdmin().then(setCategorias).catch(() => undefined);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/admin/productos');
        else setEsAdmin(false);
      });
  }, [router]);

  useEffect(() => {
    if (esAdmin) cargar();
  }, [esAdmin, q, pagina]);

  function abrirNuevo(): void {
    setProductoId('nuevo');
    setForm(FORM_VACIO);
    setAvisoOrdenes(false);
    setFormError(null);
    setFormEstado('ok');
  }

  async function abrirEditar(row: ProductoAdminResumen): Promise<void> {
    setProductoId(row.id);
    setAvisoOrdenes(row.tiene_ordenes);
    setFormError(null);
    setFormEstado('cargando');
    try {
      const p = await api.verProductoAdmin(row.id);
      setForm({
        titulo: p.titulo,
        descripcion: p.descripcion,
        precio: String(p.precio),
        stock: String(p.stock),
        marcaPropia: p.marca_propia ? 'propio' : 'terceros',
        urlExterna: p.url_externa ?? '',
        categoriaId: p.categoria_id ?? '',
        configurarDescuento: p.umbral_mayorista !== null,
        umbralMayorista: p.umbral_mayorista !== null ? String(p.umbral_mayorista) : '',
        descuentoPct: p.descuento_mayorista_porcentaje !== null ? String(p.descuento_mayorista_porcentaje) : '',
        imagenUrl: p.imagen_url ?? '',
      });
      setFormEstado('ok');
    } catch {
      setFormError('No pudimos cargar el detalle del producto.');
      setFormEstado('ok');
    }
  }

  async function guardar(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setFormError(null);

    if (!form.titulo.trim() || !form.descripcion.trim()) {
      setFormError('El título y la descripción son obligatorios.');
      return;
    }
    if (Number(form.precio) < 0) {
      setFormError('El precio debe ser mayor o igual a 0.');
      return;
    }
    if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) {
      setFormError('El stock debe ser un número entero mayor o igual a 0.');
      return;
    }
    if (form.marcaPropia === 'terceros' && !form.urlExterna.trim()) {
      setFormError('Los productos de terceros deben tener una URL externa válida.');
      return;
    }
    if (form.configurarDescuento && (!form.umbralMayorista || !form.descuentoPct)) {
      setFormError('Si configurás descuento mayorista, completá tanto el umbral como el porcentaje.');
      return;
    }

    const datos: ProductoAdminInput = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim(),
      precio: Number(form.precio),
      stock: Number(form.stock),
      marca_propia: form.marcaPropia === 'propio',
      url_externa: form.marcaPropia === 'propio' ? null : form.urlExterna.trim(),
      categoria_id: form.categoriaId || null,
      umbral_mayorista: form.configurarDescuento ? Number(form.umbralMayorista) : null,
      descuento_mayorista_porcentaje: form.configurarDescuento ? Number(form.descuentoPct) : null,
      imagen_url: form.imagenUrl.trim() || null,
    };

    setGuardando(true);
    try {
      if (productoId === 'nuevo') {
        await api.crearProductoAdmin(datos);
        notificar('Producto creado.', 'ok');
      } else if (productoId) {
        await api.actualizarProductoAdmin(productoId, datos);
        notificar('Producto actualizado.', 'ok');
      }
      setProductoId(null);
      cargar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?volver=/admin/productos');
        return;
      }
      if (err instanceof ApiError && (err.status === 422 || err.status === 404)) {
        setFormError(err.problema.detail ?? 'No pudimos guardar el producto.');
      } else {
        setFormError('No pudimos conectar. Revisá tu conexión.');
      }
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarDesactivar(): Promise<void> {
    if (!aDesactivar) return;
    setDesactivando(true);
    try {
      await api.desactivarProductoAdmin(aDesactivar.id);
      notificar('Producto desactivado.', 'ok');
      setADesactivar(null);
      cargar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?volver=/admin/productos');
        return;
      }
      notificar('No pudimos desactivar el producto.', 'error');
      setADesactivar(null);
    } finally {
      setDesactivando(false);
    }
  }

  // F2: inverso de "Desactivar" — no es destructiva ni oculta nada, así que va directo, sin diálogo
  // de confirmación (a diferencia de confirmarDesactivar).
  async function reactivar(row: ProductoAdminResumen): Promise<void> {
    setReactivandoId(row.id);
    try {
      await api.reactivarProductoAdmin(row.id);
      notificar('Producto reactivado.', 'ok');
      cargar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?volver=/admin/productos');
        return;
      }
      notificar('No pudimos reactivar el producto.', 'error');
    } finally {
      setReactivandoId(null);
    }
  }

  async function abrirDemo(row: ProductoAdminResumen): Promise<void> {
    setDemoProducto(row);
    setDemoError(null);
    setDemoEstado('cargando');
    try {
      const d = await api.verDemoAdmin(row.id);
      setFormDemo({
        tipo: d.configuracion_json?.tipo ?? 'publica',
        formato: d.configuracion_json?.formato ?? 'html5',
        contenidoRef: d.configuracion_json?.contenido_ref ?? '',
        urlUnityWebgl: d.configuracion_json?.unity_webgl_url ?? '',
      });
      setDemoEstado('ok');
    } catch {
      setDemoError('No pudimos cargar la demo de este producto.');
      setDemoEstado('ok');
    }
  }

  async function guardarDemo(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!demoProducto) return;
    setDemoError(null);
    if (!formDemo.contenidoRef.trim()) {
      setDemoError('La referencia de contenido (URL a embeber) es obligatoria.');
      return;
    }
    setGuardandoDemo(true);
    try {
      await api.asignarDemoAdmin(demoProducto.id, {
        tipo: formDemo.tipo,
        formato: formDemo.formato,
        contenido_ref: formDemo.contenidoRef.trim(),
        url_unity_webgl: formDemo.urlUnityWebgl.trim() || null,
      });
      notificar('Demo guardada.', 'ok');
      setDemoProducto(null);
      cargar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?volver=/admin/productos');
        return;
      }
      if (err instanceof ApiError && (err.status === 422 || err.status === 404)) {
        setDemoError(err.problema.detail ?? 'No pudimos guardar la demo.');
      } else {
        setDemoError('No pudimos conectar. Revisá tu conexión.');
      }
    } finally {
      setGuardandoDemo(false);
    }
  }

  const columnas: ColumnaTabla<ProductoAdminResumen>[] = [
    { clave: 'titulo', encabezado: 'Título', render: (p) => p.titulo },
    { clave: 'precio', encabezado: 'Precio', alinear: 'derecha', render: (p) => precioARS(p.precio) },
    { clave: 'stock', encabezado: 'Stock', alinear: 'derecha', render: (p) => p.stock },
    {
      clave: 'activo',
      encabezado: 'Estado',
      render: (p) => <Insignia variante={p.activo ? 'ok' : 'off'}>{p.activo ? 'Activo' : 'Inactivo'}</Insignia>,
    },
    { clave: 'demo', encabezado: 'Demo', render: (p) => (p.tiene_demo ? '✓' : '—') },
    {
      clave: 'mayorista',
      encabezado: 'Descuento mayorista',
      render: (p) =>
        p.umbral_mayorista !== null
          ? `Umbral: ${p.umbral_mayorista} u. — ${p.descuento_mayorista_porcentaje}%`
          : 'Sin configuración',
    },
    {
      clave: 'acciones',
      encabezado: '',
      render: (p) => (
        <span style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Boton variante="fantasma" onClick={() => abrirDemo(p)}>
            {p.tiene_demo ? 'Editar demo' : 'Configurar demo'}
          </Boton>
          <Boton variante="fantasma" onClick={() => abrirEditar(p)}>
            Editar
          </Boton>
          {p.activo ? (
            <Boton variante="peligro" onClick={() => setADesactivar(p)}>
              Desactivar
            </Boton>
          ) : (
            <Boton variante="primario" cargando={reactivandoId === p.id} onClick={() => reactivar(p)}>
              Reactivar
            </Boton>
          )}
        </span>
      ),
    },
  ];

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem' }}>
        <p className="eyebrow">Administración</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', margin: '0.3rem 0 1.2rem' }}>Productos</h1>

        {esAdmin === false ? (
          <Alerta tipo="aviso">No tenés permisos de administrador para acceder a esta sección.</Alerta>
        ) : null}

        {esAdmin ? (
          <>
            <div className="filtros">
              <form
                role="search"
                style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}
                onSubmit={(e) => {
                  e.preventDefault();
                  setPagina(1);
                }}
              >
                <Campo id="buscar" etiqueta="Buscar" type="search" value={q} onChange={(e) => { setQ(e.target.value); setPagina(1); }} placeholder="Nombre del producto…" />
              </form>
              <div style={{ alignSelf: 'flex-end' }}>
                <Boton variante="primario" onClick={abrirNuevo}>
                  + Nuevo producto
                </Boton>
              </div>
            </div>

            {estado === 'cargando' ? <EstadoCarga>Cargando productos…</EstadoCarga> : null}
            {estado === 'error' ? (
              <EstadoError titulo="No pudimos cargar los productos">
                <Boton variante="primario" onClick={cargar}>
                  Reintentar
                </Boton>
              </EstadoError>
            ) : null}

            {estado === 'ok' && resultado && resultado.datos.length === 0 ? (
              <EstadoVacio icono={<IconoDado size={40} />} titulo="No hay productos para mostrar">
                {q ? 'Probá con otra búsqueda.' : 'Creá el primero con el botón de arriba.'}
              </EstadoVacio>
            ) : null}

            {estado === 'ok' && resultado && resultado.datos.length > 0 ? (
              <>
                <Tabla columnas={columnas} filas={resultado.datos} claveFila={(p) => p.id} />
                <Paginacion pagina={pagina} tamanio={TAMANIO_PAGINA} total={resultado.paginacion.total} onCambiar={setPagina} />
              </>
            ) : null}
          </>
        ) : null}
      </main>

      <Dialogo
        abierto={productoId !== null}
        onCerrar={() => setProductoId(null)}
        titulo={productoId === 'nuevo' ? 'Nuevo producto' : 'Editar producto'}
        ancho="ancho"
      >
        {formEstado === 'cargando' ? <EstadoCarga>Cargando…</EstadoCarga> : null}
        {formEstado === 'ok' ? (
          <form onSubmit={guardar} noValidate>
            {formError ? <Alerta tipo="error">{formError}</Alerta> : null}
            {avisoOrdenes ? (
              <Alerta tipo="aviso">
                Este producto ya tiene pedidos asociados. Cambiar el descuento mayorista no afecta
                pedidos ya realizados.
              </Alerta>
            ) : null}

            <div className="grilla-form-2-1">
              <Campo id="titulo" etiqueta="Título" required value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
              <Campo id="precio" etiqueta="Precio" type="number" min={0} step="0.01" required value={form.precio} onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))} />
            </div>

            <div className="campo">
              <label className="campo__label" htmlFor="descripcion-producto">
                Descripción
              </label>
              <textarea
                id="descripcion-producto"
                className="campo__input"
                rows={3}
                required
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              />
            </div>

            <div className="grilla-form-1-1">
              <Campo id="stock" etiqueta="Stock" type="number" min={0} required value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
              <Selector id="categoria" etiqueta="Categoría" value={form.categoriaId} onChange={(e) => setForm((f) => ({ ...f, categoriaId: e.target.value }))}>
                <option value="">Sin categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Selector>
            </div>

            <fieldset style={{ border: 'none', padding: 0, margin: '0.6rem 0' }}>
              <legend className="campo__label" style={{ marginBottom: '0.4rem' }}>
                Origen del producto
              </legend>
              <div style={{ display: 'flex', gap: '1.2rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="marca-propia"
                    checked={form.marcaPropia === 'propio'}
                    onChange={() => setForm((f) => ({ ...f, marcaPropia: 'propio', urlExterna: '' }))}
                  />
                  Propio de Acalud
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="marca-propia"
                    checked={form.marcaPropia === 'terceros'}
                    onChange={() => setForm((f) => ({ ...f, marcaPropia: 'terceros' }))}
                  />
                  De un editorial aliado (URL externa)
                </label>
              </div>
            </fieldset>

            {form.marcaPropia === 'terceros' ? (
              <Campo
                id="url-externa"
                etiqueta="URL externa"
                type="url"
                required
                placeholder="https://…"
                value={form.urlExterna}
                onChange={(e) => setForm((f) => ({ ...f, urlExterna: e.target.value }))}
              />
            ) : null}

            <SubirArchivo
              etiqueta="Imagen del producto (opcional)"
              aceptar="image/png,image/jpeg,image/webp"
              tamanioMaximoMB={5}
              tipoPreview="imagen"
              valor={form.imagenUrl}
              onCambiar={(valor) => setForm((f) => ({ ...f, imagenUrl: valor }))}
              onSubir={(archivo) => api.subirImagenProducto(archivo).then((r) => r.imagen_url)}
            />

            <div className="campo">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={form.configurarDescuento}
                  onChange={(e) => setForm((f) => ({ ...f, configurarDescuento: e.target.checked }))}
                />
                Configurar descuento por volumen (CU-22)
              </label>
            </div>

            {form.configurarDescuento ? (
              <div className="grilla-form-1-1">
                <Campo
                  id="umbral"
                  etiqueta="Umbral (unidades)"
                  type="number"
                  min={1}
                  required
                  value={form.umbralMayorista}
                  onChange={(e) => setForm((f) => ({ ...f, umbralMayorista: e.target.value }))}
                />
                <Campo
                  id="descuento-pct"
                  etiqueta="Descuento (%)"
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={form.descuentoPct}
                  onChange={(e) => setForm((f) => ({ ...f, descuentoPct: e.target.value }))}
                />
              </div>
            ) : null}

            <div className="dialogo__acciones">
              <Boton variante="fantasma" type="button" onClick={() => setProductoId(null)} disabled={guardando}>
                Cancelar
              </Boton>
              <Boton variante="primario" type="submit" cargando={guardando}>
                Guardar
              </Boton>
            </div>
          </form>
        ) : null}
      </Dialogo>

      <Dialogo
        abierto={aDesactivar !== null}
        onCerrar={() => setADesactivar(null)}
        titulo="¿Desactivar producto?"
        acciones={
          <>
            <Boton variante="fantasma" onClick={() => setADesactivar(null)} disabled={desactivando}>
              No, cancelar
            </Boton>
            <Boton variante="peligro" onClick={confirmarDesactivar} cargando={desactivando}>
              Sí, desactivar
            </Boton>
          </>
        }
      >
        <p>
          <strong>{aDesactivar?.titulo}</strong> dejará de estar visible en el catálogo. Es una baja
          lógica: las órdenes que ya lo incluyen no se ven afectadas, pero esta acción no se puede
          deshacer desde el panel.
        </p>
      </Dialogo>

      <Dialogo
        abierto={demoProducto !== null}
        onCerrar={() => setDemoProducto(null)}
        titulo={`Demo — ${demoProducto?.titulo ?? ''}`}
      >
        {demoEstado === 'cargando' ? <EstadoCarga>Cargando…</EstadoCarga> : null}
        {demoEstado === 'ok' ? (
          <form onSubmit={guardarDemo} noValidate>
            {demoError ? <Alerta tipo="error">{demoError}</Alerta> : null}
            <p style={{ color: 'var(--tinta-suave)', marginTop: 0, fontSize: '0.85rem' }}>
              Un producto tiene, como máximo, una demo configurada.
            </p>
            <div className="grilla-form-1-1">
              <Selector
                id="demo-tipo"
                etiqueta="Tipo"
                value={formDemo.tipo}
                onChange={(e) => setFormDemo((f) => ({ ...f, tipo: e.target.value as TipoDemo }))}
              >
                <option value="publica">Pública (sin sesión, CU-06)</option>
                <option value="completa">Completa (con sesión, CU-07)</option>
              </Selector>
              <Selector
                id="demo-formato"
                etiqueta="Formato"
                value={formDemo.formato}
                onChange={(e) => setFormDemo((f) => ({ ...f, formato: e.target.value as FormatoDemo }))}
              >
                <option value="html5">Interactiva (HTML5)</option>
                <option value="pdf">PDF</option>
                <option value="video">Video</option>
              </Selector>
            </div>
            <Campo
              id="demo-contenido-ref"
              etiqueta="Referencia de contenido (URL a embeber)"
              type="url"
              required
              placeholder="https://…"
              value={formDemo.contenidoRef}
              onChange={(e) => setFormDemo((f) => ({ ...f, contenidoRef: e.target.value }))}
            />
            <Campo
              id="demo-unity-webgl"
              etiqueta="URL de Unity WebGL (opcional)"
              type="url"
              placeholder="https://…"
              value={formDemo.urlUnityWebgl}
              onChange={(e) => setFormDemo((f) => ({ ...f, urlUnityWebgl: e.target.value }))}
            />
            <div className="dialogo__acciones">
              <Boton variante="fantasma" type="button" onClick={() => setDemoProducto(null)} disabled={guardandoDemo}>
                Cancelar
              </Boton>
              <Boton variante="primario" type="submit" cargando={guardandoDemo}>
                Guardar
              </Boton>
            </div>
          </form>
        ) : null}
      </Dialogo>
    </>
  );
}
