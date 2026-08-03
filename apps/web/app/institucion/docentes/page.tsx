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
  Insignia,
  Selector,
  Tabla,
  useToast,
  type ColumnaTabla,
} from '@/components/ui';
import { SiteNav } from '@/components/site-nav';
import { fechaCorta } from '@/lib/pedidos';
import {
  api,
  ApiError,
  type DetalleDocenteAsignaciones,
  type DocenteAsignado,
  type FiltroDocentesAsignados,
  type ListadoDocentesAsignados,
} from '@/lib/api';

type ProductoOpcion = { producto_id: string; nombre_producto: string };

export default function DocentesAsignadosPage() {
  const router = useRouter();
  const { notificar } = useToast();
  const [institucionId, setInstitucionId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroDocentesAsignados>({ orden: 'nombre', direccion: 'asc' });
  const [buscarTexto, setBuscarTexto] = useState('');
  const [listado, setListado] = useState<ListadoDocentesAsignados | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'sin-permiso' | 'error'>('cargando');
  const [productosOpciones, setProductosOpciones] = useState<ProductoOpcion[] | null>(null);

  const [docenteId, setDocenteId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<DetalleDocenteAsignaciones | null>(null);
  const [detalleEstado, setDetalleEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [vista, setVista] = useState<'detalle' | 'revocar'>('detalle');

  const [revocarProductoId, setRevocarProductoId] = useState<string | null>(null);
  const [revocarProductoNombre, setRevocarProductoNombre] = useState('');
  const [revocarCantidad, setRevocarCantidad] = useState(1);
  const [revocarCantidadActual, setRevocarCantidadActual] = useState(1);
  const [revocarObservaciones, setRevocarObservaciones] = useState('');
  const [revocarError, setRevocarError] = useState<string | null>(null);
  const [revocarEnviando, setRevocarEnviando] = useState(false);

  useEffect(() => {
    api
      .miInstitucion()
      .then((r) => {
        if (r.institucion_id === null) {
          router.replace('/institucion');
          return;
        }
        setInstitucionId(r.institucion_id);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/institucion/docentes');
        else setEstado('error');
      });
  }, [router]);

  useEffect(() => {
    if (!institucionId) return;
    let vivo = true;
    setEstado('cargando');
    api
      .verDocentesAsignados(institucionId, filtro)
      .then((r) => {
        if (!vivo) return;
        setListado(r);
        setEstado('ok');
        // RN-004: el filtro por producto necesita opciones — se derivan una sola vez, de la
        // primera respuesta sin filtrar, para no perder alternativas al filtrar después.
        setProductosOpciones((prev) => {
          if (prev !== null) return prev;
          const mapa = new Map<string, string>();
          r.docentes.forEach((d) => d.asignaciones.forEach((a) => mapa.set(a.producto_id, a.nombre_producto)));
          return [...mapa.entries()].map(([producto_id, nombre_producto]) => ({ producto_id, nombre_producto }));
        });
      })
      .catch((err: unknown) => {
        if (!vivo) return;
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/institucion/docentes');
        else if (err instanceof ApiError && err.status === 404) setEstado('sin-permiso');
        else setEstado('error');
      });
    return () => {
      vivo = false;
    };
  }, [institucionId, filtro, router]);

  function recargarListado(): void {
    setFiltro((f) => ({ ...f }));
  }

  async function abrirDetalle(id: string): Promise<void> {
    if (!institucionId) return;
    setDocenteId(id);
    setDetalle(null);
    setDetalleEstado('cargando');
    setVista('detalle');
    try {
      const d = await api.verDetalleDocenteAsignado(institucionId, id);
      setDetalle(d);
      setDetalleEstado('ok');
    } catch {
      setDetalleEstado('error');
    }
  }

  async function refrescarDetalle(): Promise<void> {
    if (!institucionId || !docenteId) return;
    const d = await api.verDetalleDocenteAsignado(institucionId, docenteId);
    setDetalle(d);
  }

  function abrirRevocar(productoId: string, nombreProducto: string, cantidadActiva: number): void {
    setVista('revocar');
    setRevocarProductoId(productoId);
    setRevocarProductoNombre(nombreProducto);
    setRevocarCantidad(cantidadActiva); // valor predeterminado: la cantidad total asignada
    setRevocarCantidadActual(cantidadActiva);
    setRevocarObservaciones('');
    setRevocarError(null);
  }

  async function confirmarRevocar(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!institucionId || !docenteId || !revocarProductoId) return;
    setRevocarError(null);
    setRevocarEnviando(true);
    try {
      const r = await api.revocarLicencia(institucionId, {
        docente_id: docenteId,
        producto_id: revocarProductoId,
        cantidad_a_revocar: revocarCantidad,
        observaciones: revocarObservaciones.trim() || null,
      });
      notificar(
        r.cantidad_restante > 0
          ? `Se revocó ${r.cantidad_revocada} unidad(es). El docente mantiene ${r.cantidad_restante}.`
          : 'Se revocaron todas las unidades de ese producto.',
        'ok',
      );
      await refrescarDetalle();
      recargarListado();
      setVista('detalle');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?volver=/institucion/docentes');
        return;
      }
      if (err instanceof ApiError && (err.status === 422 || err.status === 404)) {
        setRevocarError(err.problema.detail ?? 'No pudimos revocar la licencia.');
      } else {
        setRevocarError('No pudimos conectar. Revisá tu conexión.');
      }
    } finally {
      setRevocarEnviando(false);
    }
  }

  const columnas: ColumnaTabla<DocenteAsignado>[] = [
    { clave: 'nombre', encabezado: 'Docente', render: (d) => d.nombre },
    { clave: 'email', encabezado: 'Email', render: (d) => d.email },
    {
      clave: 'total',
      encabezado: 'Licencias',
      alinear: 'derecha',
      render: (d) =>
        d.total_licencias > 0 ? (
          <Insignia variante="ok">{d.total_licencias}</Insignia>
        ) : (
          <Insignia variante="off">Sin asignaciones</Insignia>
        ),
    },
    {
      clave: 'productos',
      encabezado: 'Productos asignados',
      render: (d) => {
        const activos = [...new Set(d.asignaciones.filter((a) => a.estado === 'active').map((a) => a.nombre_producto))];
        return activos.length > 0 ? activos.join(', ') : '—';
      },
    },
    {
      clave: 'ultima',
      encabezado: 'Última asignación',
      render: (d) => (d.ultima_asignacion_en ? fechaCorta(d.ultima_asignacion_en) : '—'),
    },
    {
      clave: 'accion',
      encabezado: '',
      render: (d) => (
        <Boton variante="fantasma" onClick={() => abrirDetalle(d.docente_id)}>
          Ver detalle
        </Boton>
      ),
    },
  ];

  // A2/CU-27: licencias activas agrupadas por producto (la revocación es siempre por
  // docente+producto+cantidad, no por fila individual de asignación).
  const activasPorProducto = detalle
    ? Array.from(
        detalle.asignaciones
          .filter((a) => a.estado === 'active')
          .reduce((mapa, a) => {
            const previo = mapa.get(a.producto_id);
            mapa.set(a.producto_id, {
              producto_id: a.producto_id,
              nombre_producto: a.nombre_producto,
              cantidad: (previo?.cantidad ?? 0) + a.cantidad,
            });
            return mapa;
          }, new Map<string, { producto_id: string; nombre_producto: string; cantidad: number }>())
          .values(),
      )
    : [];

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem' }}>
        <p className="eyebrow">Institución</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', margin: '0.3rem 0 1.2rem' }}>Docentes asignados</h1>

        {estado === 'cargando' ? <EstadoCarga>Cargando docentes…</EstadoCarga> : null}

        {estado === 'sin-permiso' ? (
          <Alerta tipo="aviso">
            No tenés permisos para ver el listado de docentes asignados. Contactá a tu encargado institucional.
          </Alerta>
        ) : null}

        {estado === 'error' ? (
          <EstadoError titulo="No pudimos cargar el listado de docentes">
            <Boton variante="primario" onClick={recargarListado}>
              Reintentar
            </Boton>
          </EstadoError>
        ) : null}

        {estado === 'ok' && listado && listado.docentes.length === 0 && !filtro.producto_id && !filtro.buscar ? (
          <EstadoVacio icono="👩‍🏫" titulo="Tu institución aún no tiene docentes vinculados">
            Invitá docentes a sumarse para poder asignarles licencias de tus juegos.
          </EstadoVacio>
        ) : null}

        {estado === 'ok' && listado && (listado.docentes.length > 0 || filtro.producto_id || filtro.buscar) ? (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))',
                gap: '0.8rem',
                margin: '1rem 0 1.4rem',
              }}
            >
              <div className="tarjeta" style={{ padding: '1rem' }}>
                <p style={{ margin: '0 0 0.2rem', fontSize: '0.78rem', color: 'var(--tinta-suave)' }}>
                  Docentes con asignaciones
                </p>
                <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.6rem' }}>
                  {listado.resumen.total_docentes_con_asignaciones}
                </p>
              </div>
              <div className="tarjeta" style={{ padding: '1rem' }}>
                <p style={{ margin: '0 0 0.2rem', fontSize: '0.78rem', color: 'var(--tinta-suave)' }}>
                  Licencias asignadas
                </p>
                <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.6rem' }}>
                  {listado.resumen.total_licencias_asignadas}
                </p>
              </div>
              <div className="tarjeta" style={{ padding: '1rem' }}>
                <p style={{ margin: '0 0 0.2rem', fontSize: '0.78rem', color: 'var(--tinta-suave)' }}>
                  Más asignados
                </p>
                {listado.resumen.productos_mas_asignados.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--tinta-suave)' }}>—</p>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>
                    {listado.resumen.productos_mas_asignados.map((p) => `${p.nombre_producto} (${p.total})`).join(' · ')}
                  </p>
                )}
              </div>
            </div>

            <div className="filtros">
              <Selector
                id="filtro-producto"
                etiqueta="Producto"
                value={filtro.producto_id ?? ''}
                onChange={(e) => setFiltro((f) => ({ ...f, producto_id: e.target.value || undefined }))}
              >
                <option value="">Todos los productos</option>
                {(productosOpciones ?? []).map((p) => (
                  <option key={p.producto_id} value={p.producto_id}>
                    {p.nombre_producto}
                  </option>
                ))}
              </Selector>
              <form
                role="search"
                style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}
                onSubmit={(e) => {
                  e.preventDefault();
                  setFiltro((f) => ({ ...f, buscar: buscarTexto.trim() || undefined }));
                }}
              >
                <Campo
                  id="filtro-buscar"
                  etiqueta="Buscar docente"
                  type="search"
                  value={buscarTexto}
                  onChange={(e) => setBuscarTexto(e.target.value)}
                  placeholder="Nombre del docente…"
                />
                <Boton variante="fantasma" type="submit">
                  Buscar
                </Boton>
              </form>
              <Selector
                id="orden"
                etiqueta="Ordenar por"
                value={filtro.orden ?? 'nombre'}
                onChange={(e) =>
                  setFiltro((f) => ({ ...f, orden: e.target.value as FiltroDocentesAsignados['orden'] }))
                }
              >
                <option value="nombre">Nombre</option>
                <option value="total_licencias">Total de licencias</option>
              </Selector>
              <Boton
                variante="fantasma"
                onClick={() => setFiltro((f) => ({ ...f, direccion: f.direccion === 'asc' ? 'desc' : 'asc' }))}
              >
                {filtro.direccion === 'asc' ? '↑ Ascendente' : '↓ Descendente'}
              </Boton>
            </div>

            {listado.docentes.length === 0 ? (
              <Alerta tipo="aviso">Ningún docente coincide con el filtro aplicado.</Alerta>
            ) : (
              <Tabla columnas={columnas} filas={listado.docentes} claveFila={(d) => d.docente_id} />
            )}
          </>
        ) : null}
      </main>

      <Dialogo
        abierto={docenteId !== null}
        onCerrar={() => setDocenteId(null)}
        titulo={
          vista === 'revocar'
            ? `Revocar licencia — ${revocarProductoNombre}`
            : (detalle?.nombre ?? 'Detalle del docente')
        }
      >
        {vista === 'detalle' ? (
          <>
            {detalleEstado === 'cargando' ? <EstadoCarga>Cargando…</EstadoCarga> : null}
            {detalleEstado === 'error' ? <EstadoError titulo="No pudimos cargar el detalle" /> : null}
            {detalleEstado === 'ok' && detalle ? (
              <div>
                <div className="dato">
                  <span className="dato__k">Email</span>
                  <span className="dato__v">{detalle.email}</span>
                </div>
                <div className="dato">
                  <span className="dato__k">Vinculado desde</span>
                  <span className="dato__v">{detalle.vinculado_en ? fechaCorta(detalle.vinculado_en) : '—'}</span>
                </div>

                {activasPorProducto.length > 0 ? (
                  <>
                    <h3 style={{ fontSize: '1rem', margin: '1.1rem 0 0.4rem' }}>Licencias activas</h3>
                    <ul className="lista-recursos">
                      {activasPorProducto.map((p) => (
                        <li key={p.producto_id}>
                          <span>
                            {p.nombre_producto} · {p.cantidad} unidades
                          </span>
                          <Boton variante="fantasma" onClick={() => abrirRevocar(p.producto_id, p.nombre_producto, p.cantidad)}>
                            Revocar
                          </Boton>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p style={{ color: 'var(--tinta-suave)', fontSize: '0.9rem' }}>
                    Este docente no tiene licencias activas.
                  </p>
                )}

                <h3 style={{ fontSize: '1rem', margin: '1.1rem 0 0.4rem' }}>Historial de asignaciones</h3>
                <ul className="lista-recursos">
                  {detalle.asignaciones.map((a, i) => (
                    <li key={i} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
                      <span style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span>
                          {a.nombre_producto} · {a.cantidad} unidades · {fechaCorta(a.asignada_en)}
                        </span>
                        <Insignia variante={a.estado === 'active' ? 'ok' : 'off'}>
                          {a.estado === 'active' ? 'Activa' : 'Revocada'}
                        </Insignia>
                      </span>
                      {a.asignada_por ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--tinta-suave)' }}>
                          Asignada por {a.asignada_por}
                        </span>
                      ) : null}
                      {a.estado === 'revoked' ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--tinta-suave)' }}>
                          Revocada {a.revocada_en ? `el ${fechaCorta(a.revocada_en)}` : ''}
                          {a.revocada_por ? ` por ${a.revocada_por}` : ''}
                          {a.razon_revocacion ? ` — ${a.razon_revocacion}` : ''}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}

        {vista === 'revocar' ? (
          <form onSubmit={confirmarRevocar} noValidate>
            {revocarError ? <Alerta tipo="error">{revocarError}</Alerta> : null}
            <p style={{ color: 'var(--tinta-suave)', marginTop: 0 }}>
              {detalle?.nombre} tiene <strong>{revocarCantidadActual}</strong> unidad(es) asignada(s) de{' '}
              {revocarProductoNombre}.
            </p>
            <Campo
              id="revocar-cantidad"
              etiqueta="Cantidad a revocar"
              type="number"
              min={1}
              max={revocarCantidadActual}
              required
              value={revocarCantidad}
              onChange={(e) =>
                setRevocarCantidad(Math.max(1, Math.min(revocarCantidadActual, Number(e.target.value) || 1)))
              }
            />
            <Campo
              id="revocar-observaciones"
              etiqueta="Motivo (opcional)"
              value={revocarObservaciones}
              onChange={(e) => setRevocarObservaciones(e.target.value)}
            />
            <div className="dialogo__acciones">
              <Boton variante="fantasma" type="button" onClick={() => setVista('detalle')} disabled={revocarEnviando}>
                Cancelar
              </Boton>
              <Boton variante="peligro" type="submit" cargando={revocarEnviando}>
                Confirmar revocación
              </Boton>
            </div>
          </form>
        ) : null}
      </Dialogo>
    </>
  );
}
