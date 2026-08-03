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
import { precioARS, SiteNav } from '@/components/site-nav';
import { fechaCorta } from '@/lib/pedidos';
import {
  api,
  ApiError,
  type DetalleProductoInventario,
  type DocenteInstitucion,
  type FiltroInventario,
  type InventarioInstitucional,
  type ItemInventarioInstitucional,
  type OrdenInventario,
} from '@/lib/api';

type Vista = 'producto' | 'asignar' | 'revocar';

export default function InventarioInstitucionalPage() {
  const router = useRouter();
  const { notificar } = useToast();
  const [institucionId, setInstitucionId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroInventario>({ orden: 'nombre', direccion: 'asc' });
  const [inventario, setInventario] = useState<InventarioInstitucional | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'sin-permiso' | 'error'>('cargando');

  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<DetalleProductoInventario | null>(null);
  const [detalleEstado, setDetalleEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [vista, setVista] = useState<Vista>('producto');

  // CU-26: asignar licencias del producto abierto a un docente.
  const [docentes, setDocentes] = useState<DocenteInstitucion[] | null>(null);
  const [asignarDocenteId, setAsignarDocenteId] = useState('');
  const [asignarCantidad, setAsignarCantidad] = useState(1);
  const [asignarObservaciones, setAsignarObservaciones] = useState('');
  const [asignarError, setAsignarError] = useState<string | null>(null);
  const [asignarEnviando, setAsignarEnviando] = useState(false);

  // CU-27: revocar licencias de un docente puntual (fila del detalle del producto).
  const [revocarDocenteId, setRevocarDocenteId] = useState<string | null>(null);
  const [revocarDocenteNombre, setRevocarDocenteNombre] = useState('');
  const [revocarCantidad, setRevocarCantidad] = useState(1);
  const [revocarCantidadActual, setRevocarCantidadActual] = useState(1);
  const [revocarObservaciones, setRevocarObservaciones] = useState('');
  const [revocarError, setRevocarError] = useState<string | null>(null);
  const [revocarEnviando, setRevocarEnviando] = useState(false);

  // Paso 1: resolver institucion_id (RN-004 lo termina de validar el propio /inventario, 404 si
  // el usuario no es encargado — mismo criterio "ajeno = 404" del resto del proyecto).
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
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/institucion/inventario');
        else setEstado('error');
      });
  }, [router]);

  useEffect(() => {
    if (!institucionId) return;
    let vivo = true;
    setEstado('cargando');
    api
      .verInventario(institucionId, filtro)
      .then((r) => {
        if (!vivo) return;
        setInventario(r);
        setEstado('ok');
      })
      .catch((err: unknown) => {
        if (!vivo) return;
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/institucion/inventario');
        else if (err instanceof ApiError && err.status === 404) setEstado('sin-permiso');
        else setEstado('error');
      });
    return () => {
      vivo = false;
    };
  }, [institucionId, filtro, router]);

  function recargarInventario(): void {
    setFiltro((f) => ({ ...f }));
  }

  async function abrirDetalle(productoId: string): Promise<void> {
    if (!institucionId) return;
    setDetalleId(productoId);
    setDetalle(null);
    setDetalleEstado('cargando');
    setVista('producto');
    try {
      const d = await api.verDetalleInventario(institucionId, productoId);
      setDetalle(d);
      setDetalleEstado('ok');
    } catch {
      setDetalleEstado('error');
    }
  }

  async function refrescarDetalle(): Promise<void> {
    if (!institucionId || !detalleId) return;
    const d = await api.verDetalleInventario(institucionId, detalleId);
    setDetalle(d);
  }

  async function abrirAsignar(): Promise<void> {
    if (!institucionId) return;
    setVista('asignar');
    setAsignarError(null);
    setAsignarDocenteId('');
    setAsignarCantidad(1);
    setAsignarObservaciones('');
    if (docentes === null) {
      try {
        const r = await api.listarDocentesInstitucion(institucionId);
        setDocentes(r.docentes);
      } catch {
        setAsignarError('No pudimos cargar la lista de docentes.');
      }
    }
  }

  async function confirmarAsignar(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!institucionId || !detalleId || !asignarDocenteId) return;
    setAsignarError(null);
    setAsignarEnviando(true);
    try {
      await api.asignarLicencias(institucionId, {
        producto_id: detalleId,
        asignaciones: [{ docente_id: asignarDocenteId, cantidad: asignarCantidad }],
        observaciones: asignarObservaciones.trim() || null,
      });
      notificar('¡Licencias asignadas! El docente recibirá una notificación.', 'ok');
      await refrescarDetalle();
      recargarInventario();
      setVista('producto');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?volver=/institucion/inventario');
        return;
      }
      if (err instanceof ApiError && (err.status === 422 || err.status === 404)) {
        setAsignarError(err.problema.detail ?? 'No pudimos asignar las licencias.');
      } else {
        setAsignarError('No pudimos conectar. Revisá tu conexión.');
      }
    } finally {
      setAsignarEnviando(false);
    }
  }

  function abrirRevocar(docenteId: string, nombre: string, cantidadActual: number): void {
    setVista('revocar');
    setRevocarDocenteId(docenteId);
    setRevocarDocenteNombre(nombre);
    setRevocarCantidad(cantidadActual); // valor predeterminado: la cantidad total asignada
    setRevocarCantidadActual(cantidadActual);
    setRevocarObservaciones('');
    setRevocarError(null);
  }

  async function confirmarRevocar(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!institucionId || !detalleId || !revocarDocenteId) return;
    setRevocarError(null);
    setRevocarEnviando(true);
    try {
      const r = await api.revocarLicencia(institucionId, {
        docente_id: revocarDocenteId,
        producto_id: detalleId,
        cantidad_a_revocar: revocarCantidad,
        observaciones: revocarObservaciones.trim() || null,
      });
      notificar(
        r.cantidad_restante > 0
          ? `Se revocó ${r.cantidad_revocada} unidad(es). El docente mantiene ${r.cantidad_restante}.`
          : 'Se revocaron todas las unidades. El docente ya no tiene asignado este producto.',
        'ok',
      );
      await refrescarDetalle();
      recargarInventario();
      setVista('producto');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?volver=/institucion/inventario');
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

  const columnas: ColumnaTabla<ItemInventarioInstitucional>[] = [
    { clave: 'nombre', encabezado: 'Producto', render: (i) => i.nombre_producto },
    { clave: 'adquirida', encabezado: 'Adquirida', alinear: 'derecha', render: (i) => i.cantidad_adquirida },
    { clave: 'asignada', encabezado: 'Asignada', alinear: 'derecha', render: (i) => i.cantidad_asignada },
    { clave: 'disponible', encabezado: 'Disponible', alinear: 'derecha', render: (i) => i.cantidad_disponible },
    {
      clave: 'ultima_compra',
      encabezado: 'Última compra',
      render: (i) => (i.ultima_compra_en ? fechaCorta(i.ultima_compra_en) : '—'),
    },
    {
      clave: 'accion',
      encabezado: '',
      render: (i) => (
        <Boton variante="fantasma" onClick={() => abrirDetalle(i.producto_id)}>
          Ver detalle
        </Boton>
      ),
    },
  ];

  const tituloDialogo =
    vista === 'asignar'
      ? `Asignar licencias — ${detalle?.nombre_producto ?? ''}`
      : vista === 'revocar'
        ? `Revocar licencia — ${revocarDocenteNombre}`
        : (detalle?.nombre_producto ?? 'Detalle del producto');

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem' }}>
        <p className="eyebrow">Institución</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', margin: '0.3rem 0 1.2rem' }}>
          Inventario institucional
        </h1>

        {estado === 'cargando' ? <EstadoCarga>Cargando inventario…</EstadoCarga> : null}

        {estado === 'sin-permiso' ? (
          <Alerta tipo="aviso">
            No tenés permisos para ver el inventario institucional. Contactá a tu encargado.
          </Alerta>
        ) : null}

        {estado === 'error' ? (
          <EstadoError titulo="No pudimos cargar el inventario">
            <Boton variante="primario" onClick={() => setFiltro((f) => ({ ...f }))}>
              Reintentar
            </Boton>
          </EstadoError>
        ) : null}

        {estado === 'ok' && inventario && inventario.items.length === 0 ? (
          <EstadoVacio
            icono="📦"
            titulo="Tu institución aún no adquirió juegos"
            accion={
              <Boton variante="primario" href="/institucion/carrito">
                Comprar en lote
              </Boton>
            }
          >
            Comprá en lote para empezar a armar tu inventario institucional.
          </EstadoVacio>
        ) : null}

        {estado === 'ok' && inventario && inventario.items.length > 0 ? (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))',
                gap: '0.8rem',
                margin: '1rem 0 1.4rem',
              }}
            >
              {[
                ['Adquiridas', inventario.resumen.total_adquiridas],
                ['Docentes asignados', inventario.resumen.docentes_asignados],
                ['En uso', inventario.resumen.total_en_uso],
                ['Disponibles', inventario.resumen.total_disponibles],
              ].map(([etiqueta, valor]) => (
                <div key={etiqueta} className="tarjeta" style={{ padding: '1rem' }}>
                  <p style={{ margin: '0 0 0.2rem', fontSize: '0.78rem', color: 'var(--tinta-suave)' }}>{etiqueta}</p>
                  <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.6rem' }}>
                    {valor}
                  </p>
                </div>
              ))}
            </div>

            <div className="filtros">
              <Selector
                id="orden"
                etiqueta="Ordenar por"
                value={filtro.orden ?? 'nombre'}
                onChange={(e) => setFiltro((f) => ({ ...f, orden: e.target.value as OrdenInventario }))}
              >
                <option value="nombre">Nombre</option>
                <option value="cantidad_adquirida">Cantidad adquirida</option>
                <option value="cantidad_asignada">Cantidad asignada</option>
                <option value="cantidad_disponible">Cantidad disponible</option>
                <option value="ultima_compra">Última compra</option>
              </Selector>
              <Boton
                variante="fantasma"
                onClick={() => setFiltro((f) => ({ ...f, direccion: f.direccion === 'asc' ? 'desc' : 'asc' }))}
              >
                {filtro.direccion === 'asc' ? '↑ Ascendente' : '↓ Descendente'}
              </Boton>
            </div>

            <Tabla columnas={columnas} filas={inventario.items} claveFila={(i) => i.producto_id} />
          </>
        ) : null}
      </main>

      <Dialogo abierto={detalleId !== null} onCerrar={() => setDetalleId(null)} titulo={tituloDialogo}>
        {vista === 'producto' ? (
          <>
            {detalleEstado === 'cargando' ? <EstadoCarga>Cargando…</EstadoCarga> : null}
            {detalleEstado === 'error' ? <EstadoError titulo="No pudimos cargar el detalle" /> : null}
            {detalleEstado === 'ok' && detalle ? (
              <div>
                {detalle.descripcion_producto ? (
                  <p style={{ color: 'var(--tinta-suave)', marginTop: 0 }}>{detalle.descripcion_producto}</p>
                ) : null}
                <div className="dato">
                  <span className="dato__k">Precio</span>
                  <span className="dato__v">{precioARS(detalle.precio)}</span>
                </div>
                <div className="dato">
                  <span className="dato__k">Adquirida / Asignada / Disponible</span>
                  <span className="dato__v">
                    {detalle.cantidad_adquirida} / {detalle.cantidad_asignada} / {detalle.cantidad_disponible}
                  </span>
                </div>

                {detalle.cantidad_disponible > 0 ? (
                  <Boton variante="primario" onClick={abrirAsignar} style={{ marginTop: '0.9rem' }}>
                    Asignar licencias
                  </Boton>
                ) : null}

                <h3 style={{ fontSize: '1rem', margin: '1.1rem 0 0.4rem' }}>Historial de compras</h3>
                {detalle.compras.length === 0 ? (
                  <p style={{ color: 'var(--tinta-suave)', fontSize: '0.9rem' }}>Sin compras registradas.</p>
                ) : (
                  <ul className="lista-recursos">
                    {detalle.compras.map((c) => (
                      <li key={c.orden_id}>
                        <span>
                          {c.numero} · {fechaCorta(c.fecha)} · {c.cantidad} unidades
                        </span>
                        <span>{precioARS(c.monto)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <h3 style={{ fontSize: '1rem', margin: '1.1rem 0 0.4rem' }}>Docentes con licencias asignadas</h3>
                {detalle.docentes.length === 0 ? (
                  <p style={{ color: 'var(--tinta-suave)', fontSize: '0.9rem' }}>
                    Ningún docente tiene asignado este producto.
                  </p>
                ) : (
                  <ul className="lista-recursos">
                    {detalle.docentes.map((d, i) => (
                      <li key={i}>
                        <span>
                          {d.nombre} · {d.cantidad} unidades
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Insignia variante={d.estado === 'active' ? 'ok' : 'off'}>
                            {d.estado === 'active' ? 'Activa' : 'Revocada'}
                          </Insignia>
                          {d.estado === 'active' ? (
                            <Boton
                              variante="fantasma"
                              onClick={() => abrirRevocar(d.docente_id, d.nombre, d.cantidad)}
                            >
                              Revocar
                            </Boton>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </>
        ) : null}

        {vista === 'asignar' ? (
          <form onSubmit={confirmarAsignar} noValidate>
            {asignarError ? <Alerta tipo="error">{asignarError}</Alerta> : null}
            <p style={{ color: 'var(--tinta-suave)', marginTop: 0 }}>
              Disponibles: <strong>{detalle?.cantidad_disponible ?? 0}</strong> unidades.
            </p>
            {docentes === null ? (
              <EstadoCarga>Cargando docentes…</EstadoCarga>
            ) : docentes.length === 0 ? (
              <Alerta tipo="aviso">
                No hay docentes vinculados a tu institución todavía. Invitalos desde el registro de tu
                institución para poder asignarles licencias.
              </Alerta>
            ) : (
              <>
                <Selector
                  id="asignar-docente"
                  etiqueta="Docente"
                  required
                  value={asignarDocenteId}
                  onChange={(e) => setAsignarDocenteId(e.target.value)}
                >
                  <option value="">Elegí un docente…</option>
                  {docentes.map((d) => (
                    <option key={d.docente_id} value={d.docente_id}>
                      {d.nombre} ({d.email})
                    </option>
                  ))}
                </Selector>
                <Campo
                  id="asignar-cantidad"
                  etiqueta="Cantidad"
                  type="number"
                  min={1}
                  max={detalle?.cantidad_disponible ?? 1}
                  required
                  value={asignarCantidad}
                  onChange={(e) => setAsignarCantidad(Math.max(1, Number(e.target.value) || 1))}
                />
                <Campo
                  id="asignar-observaciones"
                  etiqueta="Observaciones (opcional)"
                  value={asignarObservaciones}
                  onChange={(e) => setAsignarObservaciones(e.target.value)}
                />
              </>
            )}
            <div className="dialogo__acciones">
              <Boton variante="fantasma" type="button" onClick={() => setVista('producto')} disabled={asignarEnviando}>
                Cancelar
              </Boton>
              {docentes && docentes.length > 0 ? (
                <Boton variante="primario" type="submit" cargando={asignarEnviando} disabled={!asignarDocenteId}>
                  Asignar licencias
                </Boton>
              ) : null}
            </div>
          </form>
        ) : null}

        {vista === 'revocar' ? (
          <form onSubmit={confirmarRevocar} noValidate>
            {revocarError ? <Alerta tipo="error">{revocarError}</Alerta> : null}
            <p style={{ color: 'var(--tinta-suave)', marginTop: 0 }}>
              {revocarDocenteNombre} tiene <strong>{revocarCantidadActual}</strong> unidad(es) asignada(s) de{' '}
              {detalle?.nombre_producto}.
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
              <Boton variante="fantasma" type="button" onClick={() => setVista('producto')} disabled={revocarEnviando}>
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
