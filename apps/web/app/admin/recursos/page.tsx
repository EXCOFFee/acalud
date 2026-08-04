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
  IconoCandado,
  IconoDocumento,
  Insignia,
  Selector,
  SubirArchivo,
  Tabla,
  useToast,
  type ColumnaTabla,
} from '@/components/ui';
import { SiteNav } from '@/components/site-nav';
import {
  api,
  ApiError,
  type ProductoAdminResumen,
  type RecursoAdmin,
  type RecursoAdminInput,
  type TipoRecurso,
} from '@/lib/api';

const FORM_VACIO = {
  titulo: '',
  tipo: 'link' as TipoRecurso,
  url: '',
  licenciado: false,
  productoId: '',
};

type FormState = typeof FORM_VACIO;

export default function AdminRecursosPage() {
  const router = useRouter();
  const { notificar } = useToast();
  const [esAdmin, setEsAdmin] = useState<boolean | null>(null);
  const [productos, setProductos] = useState<ProductoAdminResumen[]>([]);
  const [recursos, setRecursos] = useState<RecursoAdmin[] | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  const [edicion, setEdicion] = useState<RecursoAdmin | 'nuevo' | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [formError, setFormError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [aEliminar, setAEliminar] = useState<RecursoAdmin | null>(null);
  const [eliminando, setEliminando] = useState(false);

  function cargar(): void {
    setEstado('cargando');
    api
      .listarRecursosAdmin()
      .then((r) => {
        setRecursos(r);
        setEstado('ok');
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/admin/recursos');
        else setEstado('error');
      });
  }

  useEffect(() => {
    api
      .me()
      .then((p) => {
        setEsAdmin(p.es_admin);
        if (p.es_admin) {
          cargar();
          api.listarProductosAdmin({ tamanio: 100 }).then((r) => setProductos(r.datos)).catch(() => undefined);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/admin/recursos');
        else setEsAdmin(false);
      });
  }, [router]);

  function nombreProducto(id: string | null): string {
    if (!id) return '—';
    return productos.find((p) => p.id === id)?.titulo ?? id;
  }

  function abrirNuevo(): void {
    setEdicion('nuevo');
    setForm(FORM_VACIO);
    setFormError(null);
  }

  function abrirEditar(r: RecursoAdmin): void {
    setEdicion(r);
    setForm({
      titulo: r.titulo,
      tipo: r.tipo,
      url: r.url,
      licenciado: r.licenciado,
      productoId: r.producto_id ?? '',
    });
    setFormError(null);
  }

  async function guardar(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setFormError(null);
    if (!form.titulo.trim() || !form.url.trim()) {
      setFormError('El título y la URL son obligatorios.');
      return;
    }

    const datos: RecursoAdminInput = {
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      url: form.url.trim(),
      licenciado: form.licenciado,
      producto_id: form.productoId || null,
    };

    setGuardando(true);
    try {
      if (edicion === 'nuevo') {
        await api.crearRecursoAdmin(datos);
        notificar('Recurso creado.', 'ok');
      } else if (edicion) {
        await api.actualizarRecursoAdmin(edicion.id, datos);
        notificar('Recurso actualizado.', 'ok');
      }
      setEdicion(null);
      cargar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?volver=/admin/recursos');
        return;
      }
      if (err instanceof ApiError && (err.status === 422 || err.status === 404)) {
        setFormError(err.problema.detail ?? 'No pudimos guardar el recurso.');
      } else {
        setFormError('No pudimos conectar. Revisá tu conexión.');
      }
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminar(): Promise<void> {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await api.eliminarRecursoAdmin(aEliminar.id);
      notificar('Recurso eliminado.', 'ok');
      setAEliminar(null);
      cargar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?volver=/admin/recursos');
        return;
      }
      notificar('No pudimos eliminar el recurso.', 'error');
      setAEliminar(null);
    } finally {
      setEliminando(false);
    }
  }

  const columnas: ColumnaTabla<RecursoAdmin>[] = [
    { clave: 'titulo', encabezado: 'Título', render: (r) => r.titulo },
    { clave: 'tipo', encabezado: 'Tipo', render: (r) => (r.tipo === 'pdf' ? 'PDF' : 'Enlace') },
    {
      clave: 'licenciado',
      encabezado: 'Acceso',
      render: (r) => (
        <Insignia variante={r.licenciado ? 'off' : 'ok'}>
          {r.licenciado ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <IconoCandado size={12} /> Con compra
            </span>
          ) : (
            'Libre'
          )}
        </Insignia>
      ),
    },
    { clave: 'producto', encabezado: 'Producto', render: (r) => nombreProducto(r.producto_id) },
    {
      clave: 'acciones',
      encabezado: '',
      render: (r) => (
        <span style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Boton variante="fantasma" onClick={() => abrirEditar(r)}>
            Editar
          </Boton>
          <Boton variante="peligro" onClick={() => setAEliminar(r)}>
            Eliminar
          </Boton>
        </span>
      ),
    },
  ];

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem' }}>
        <p className="eyebrow">Administración</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', margin: '0.3rem 0 1.2rem' }}>Recursos</h1>

        {esAdmin === false ? (
          <Alerta tipo="aviso">No tenés permisos de administrador para acceder a esta sección.</Alerta>
        ) : null}

        {esAdmin ? (
          <>
            {estado === 'cargando' ? <EstadoCarga>Cargando recursos…</EstadoCarga> : null}
            {estado === 'error' ? (
              <EstadoError titulo="No pudimos cargar los recursos">
                <Boton variante="primario" onClick={cargar}>
                  Reintentar
                </Boton>
              </EstadoError>
            ) : null}

            {estado === 'ok' ? (
              <div style={{ marginBottom: '1rem' }}>
                <Boton variante="primario" onClick={abrirNuevo}>
                  + Nuevo recurso
                </Boton>
              </div>
            ) : null}

            {estado === 'ok' && recursos && recursos.length === 0 ? (
              <EstadoVacio icono={<IconoDocumento size={40} />} titulo="Todavía no hay recursos">
                Creá el primero con el botón de arriba.
              </EstadoVacio>
            ) : null}

            {estado === 'ok' && recursos && recursos.length > 0 ? (
              <Tabla columnas={columnas} filas={recursos} claveFila={(r) => r.id} />
            ) : null}
          </>
        ) : null}
      </main>

      <Dialogo
        abierto={edicion !== null}
        onCerrar={() => setEdicion(null)}
        titulo={edicion === 'nuevo' ? 'Nuevo recurso' : 'Editar recurso'}
      >
        <form onSubmit={guardar} noValidate>
          {formError ? <Alerta tipo="error">{formError}</Alerta> : null}
          <Campo id="titulo-recurso" etiqueta="Título" required value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <Selector id="tipo-recurso" etiqueta="Tipo" value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoRecurso }))}>
              <option value="link">Enlace</option>
              <option value="pdf">PDF</option>
            </Selector>
            <Selector id="producto-recurso" etiqueta="Producto asociado (opcional)" value={form.productoId} onChange={(e) => setForm((f) => ({ ...f, productoId: e.target.value }))}>
              <option value="">Ninguno</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.titulo}
                </option>
              ))}
            </Selector>
          </div>
          {form.tipo === 'pdf' ? (
            // CU-19 A9/RN-009: para tipo pdf, `url` siempre es un path interno del bucket
            // 'recursos' (ver descargar-recurso.ts) — no se permite pegar una URL externa acá,
            // rompería la firma de descarga.
            <SubirArchivo
              etiqueta="Archivo PDF"
              aceptar="application/pdf"
              tamanioMaximoMB={20}
              tipoPreview="archivo"
              permitirUrlManual={false}
              valor={form.url}
              onCambiar={(valor) => setForm((f) => ({ ...f, url: valor }))}
              onSubir={(archivo) => api.subirPdfRecurso(archivo).then((r) => r.url)}
            />
          ) : (
            <Campo id="url-recurso" etiqueta="URL" required placeholder="https://…" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
          )}
          <div className="campo">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.licenciado} onChange={(e) => setForm((f) => ({ ...f, licenciado: e.target.checked }))} />
              Requiere licencia (solo para quien compró el producto)
            </label>
          </div>
          <div className="dialogo__acciones">
            <Boton variante="fantasma" type="button" onClick={() => setEdicion(null)} disabled={guardando}>
              Cancelar
            </Boton>
            <Boton variante="primario" type="submit" cargando={guardando}>
              Guardar
            </Boton>
          </div>
        </form>
      </Dialogo>

      <Dialogo
        abierto={aEliminar !== null}
        onCerrar={() => setAEliminar(null)}
        titulo="¿Eliminar recurso?"
        acciones={
          <>
            <Boton variante="fantasma" onClick={() => setAEliminar(null)} disabled={eliminando}>
              No, cancelar
            </Boton>
            <Boton variante="peligro" onClick={confirmarEliminar} cargando={eliminando}>
              Sí, eliminar
            </Boton>
          </>
        }
      >
        <p>
          Vas a eliminar <strong>{aEliminar?.titulo}</strong> de forma permanente (a diferencia de
          los productos, acá no hay baja lógica).
        </p>
      </Dialogo>
    </>
  );
}
