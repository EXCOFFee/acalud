'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alerta,
  Boton,
  Dialogo,
  EstadoCarga,
  EstadoError,
  EstadoVacio,
  IconoCarrito,
  IconoPaquete,
  Insignia,
  Paginacion,
  Selector,
  Tabla,
  type ColumnaTabla,
} from '@/components/ui';
import { precioARS, SiteNav } from '@/components/site-nav';
import { ESTADO_PEDIDO, etiquetaEstadoTracking, fechaCorta, fechaHoraCorta, tieneTrackingVisible } from '@/lib/pedidos';
import {
  api,
  ApiError,
  type DetalleOrdenHistorial,
  type EstadoPedido,
  type FiltroPedidos,
  type OrdenHistorial,
  type ResultadoPaginado,
  type Seguimiento,
} from '@/lib/api';

const TAMANIO_PAGINA = 20; // RNF-004: paginado cuando hay muchas órdenes

export default function PedidosPage() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<FiltroPedidos>({
    orden_por: 'created_at',
    orden_dir: 'desc',
    pagina: 1,
    limite: TAMANIO_PAGINA,
  });
  const [resultado, setResultado] = useState<ResultadoPaginado<OrdenHistorial> | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<DetalleOrdenHistorial | null>(null);
  const [detalleEstado, setDetalleEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  const [vista, setVista] = useState<'detalle' | 'seguimiento'>('detalle');
  const [seguimiento, setSeguimiento] = useState<Seguimiento | null>(null);
  const [seguimientoEstado, setSeguimientoEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [seguimientoError, setSeguimientoError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setEstado('cargando');
    api
      .listarPedidos(filtro)
      .then((r) => {
        if (!vivo) return;
        setResultado(r);
        setEstado('ok');
      })
      .catch((err: unknown) => {
        if (!vivo) return;
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/cuenta/pedidos');
        else setEstado('error');
      });
    return () => {
      vivo = false;
    };
  }, [filtro, router]);

  async function abrirDetalle(id: string): Promise<void> {
    setDetalleId(id);
    setDetalle(null);
    setDetalleEstado('cargando');
    setVista('detalle');
    try {
      const d = await api.verPedido(id);
      setDetalle(d);
      setDetalleEstado('ok');
    } catch {
      setDetalleEstado('error');
    }
  }

  // CU-13: seguimiento del pedido, dentro del mismo diálogo (RNF-009: nunca en la URL).
  async function verSeguimiento(): Promise<void> {
    if (!detalleId) return;
    setVista('seguimiento');
    setSeguimientoEstado('cargando');
    setSeguimientoError(null);
    try {
      const s = await api.verSeguimiento(detalleId);
      setSeguimiento(s);
      setSeguimientoEstado('ok');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setSeguimientoError('Este pedido todavía no tiene seguimiento disponible.');
      } else if (err instanceof ApiError && err.status === 503) {
        setSeguimientoError('El servicio de seguimiento no está disponible ahora. Probá de nuevo en un rato.');
      } else {
        setSeguimientoError('No pudimos cargar el seguimiento de este pedido.');
      }
      setSeguimientoEstado('error');
    }
  }

  const columnas: ColumnaTabla<OrdenHistorial>[] = [
    { clave: 'numero', encabezado: 'Número', render: (o) => o.numero },
    { clave: 'fecha', encabezado: 'Fecha', render: (o) => fechaCorta(o.fecha) },
    {
      clave: 'total',
      encabezado: 'Total',
      alinear: 'derecha',
      render: (o) => precioARS(o.total),
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (o) => <Insignia variante={ESTADO_PEDIDO[o.estado].variante}>{ESTADO_PEDIDO[o.estado].etiqueta}</Insignia>,
    },
    {
      // CU-24 RN-009: distinguir el historial institucional del personal.
      clave: 'tipo',
      encabezado: 'Tipo',
      render: (o) => (o.order_type === 'b2b' ? <Insignia variante="marca">Institucional</Insignia> : '—'),
    },
    {
      clave: 'tracking',
      encabezado: 'Tracking',
      render: (o) => (tieneTrackingVisible(o.estado) && o.tracking_code ? o.tracking_code : '—'),
    },
    {
      clave: 'accion',
      encabezado: '',
      render: (o) => (
        <Boton variante="fantasma" onClick={() => abrirDetalle(o.id)}>
          Ver detalle
        </Boton>
      ),
    },
  ];

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem' }}>
        <p className="eyebrow">Tu cuenta</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', margin: '0.3rem 0 1.2rem' }}>Mis pedidos</h1>

        {estado !== 'error' ? (
          <div className="filtros">
            <Selector
              id="filtro-estado"
              etiqueta="Estado"
              value={filtro.estado ?? ''}
              onChange={(e) =>
                setFiltro((f) => ({
                  ...f,
                  estado: (e.target.value || undefined) as EstadoPedido | undefined,
                  pagina: 1,
                }))
              }
            >
              <option value="">Todos los estados</option>
              {(Object.keys(ESTADO_PEDIDO) as EstadoPedido[]).map((e) => (
                <option key={e} value={e}>
                  {ESTADO_PEDIDO[e].etiqueta}
                </option>
              ))}
            </Selector>
            <Selector
              id="filtro-tipo"
              etiqueta="Tipo"
              value={filtro.order_type ?? ''}
              onChange={(e) =>
                setFiltro((f) => ({
                  ...f,
                  order_type: (e.target.value || undefined) as FiltroPedidos['order_type'],
                  pagina: 1,
                }))
              }
            >
              <option value="">Todos</option>
              <option value="b2c">Personales</option>
              <option value="b2b">Institucionales</option>
            </Selector>
            <Selector
              id="filtro-orden"
              etiqueta="Ordenar por"
              value={filtro.orden_por ?? 'created_at'}
              onChange={(e) =>
                setFiltro((f) => ({ ...f, orden_por: e.target.value as FiltroPedidos['orden_por'], pagina: 1 }))
              }
            >
              <option value="created_at">Fecha</option>
              <option value="total_amount">Total</option>
            </Selector>
            <Boton
              variante="fantasma"
              onClick={() =>
                setFiltro((f) => ({ ...f, orden_dir: f.orden_dir === 'asc' ? 'desc' : 'asc' }))
              }
            >
              {filtro.orden_dir === 'asc' ? '↑ Ascendente' : '↓ Descendente'}
            </Boton>
          </div>
        ) : null}

        {estado === 'cargando' ? <EstadoCarga>Cargando tus pedidos…</EstadoCarga> : null}

        {estado === 'error' ? (
          <EstadoError titulo="No pudimos cargar tu historial de compras">
            <Boton variante="primario" onClick={() => setFiltro((f) => ({ ...f }))}>
              Reintentar
            </Boton>
          </EstadoError>
        ) : null}

        {estado === 'ok' && resultado && resultado.items.length === 0 ? (
          <EstadoVacio
            icono={<IconoCarrito size={40} />}
            titulo="Aún no hiciste ninguna compra"
            accion={
              <Boton variante="primario" href="/catalogo">
                Ir al catálogo
              </Boton>
            }
          >
            Explorá el catálogo y encontrá el próximo juego para tu aula.
          </EstadoVacio>
        ) : null}

        {estado === 'ok' && resultado && resultado.items.length > 0 ? (
          <>
            <Tabla columnas={columnas} filas={resultado.items} claveFila={(o) => o.id} />
            <Paginacion
              pagina={resultado.pagina_actual}
              tamanio={filtro.limite ?? TAMANIO_PAGINA}
              total={resultado.total_items}
              onCambiar={(pagina) => setFiltro((f) => ({ ...f, pagina }))}
            />
          </>
        ) : null}
      </main>

      <Dialogo
        abierto={detalleId !== null}
        onCerrar={() => setDetalleId(null)}
        titulo={
          vista === 'seguimiento'
            ? `Seguimiento — ${detalle?.numero ?? ''}`
            : detalle
              ? `Pedido ${detalle.numero}`
              : 'Detalle del pedido'
        }
      >
        {vista === 'detalle' ? (
          <>
            {detalleEstado === 'cargando' ? <EstadoCarga>Cargando el detalle…</EstadoCarga> : null}
            {detalleEstado === 'error' ? <EstadoError titulo="No pudimos cargar este pedido" /> : null}
            {detalleEstado === 'ok' && detalle ? (
              <div>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--tinta-suave)' }}>
                  {fechaCorta(detalle.fecha)}
                  <Insignia variante={ESTADO_PEDIDO[detalle.estado].variante}>
                    {ESTADO_PEDIDO[detalle.estado].etiqueta}
                  </Insignia>
                </p>

                <ul className="lista-recursos">
                  {detalle.lineas.map((l) => (
                    <li key={l.juego_id}>
                      <span>
                        {l.nombre} × {l.cantidad}
                        {l.descuento_pct > 0 ? ` (-${l.descuento_pct}%)` : ''}
                      </span>
                      <span>{precioARS(l.precio_unitario * l.cantidad * (1 - l.descuento_pct / 100))}</span>
                    </li>
                  ))}
                </ul>

                <div style={{ marginTop: '0.9rem' }}>
                  <div className="dato">
                    <span className="dato__k">Subtotal</span>
                    <span className="dato__v">{precioARS(detalle.subtotal)}</span>
                  </div>
                  <div className="dato">
                    <span className="dato__k">Envío</span>
                    <span className="dato__v">{precioARS(detalle.envio_costo)}</span>
                  </div>
                  <div className="dato">
                    <span className="dato__k">Total</span>
                    <span className="dato__v">{precioARS(detalle.total)}</span>
                  </div>
                </div>

                {detalle.domicilio.calle ? (
                  <p style={{ marginTop: '0.9rem', fontSize: '0.9rem', color: 'var(--tinta-suave)' }}>
                    Envío a: {detalle.domicilio.calle} {detalle.domicilio.numero}, {detalle.domicilio.localidad},{' '}
                    {detalle.domicilio.provincia} ({detalle.domicilio.codigo_postal})
                  </p>
                ) : null}

                {detalle.billing_data ? (
                  <p style={{ marginTop: '0.4rem', fontSize: '0.9rem', color: 'var(--tinta-suave)' }}>
                    Facturado a: {detalle.billing_data.razon_social} (CUIT {detalle.billing_data.cuit})
                  </p>
                ) : null}

                {tieneTrackingVisible(detalle.estado) && detalle.tracking_code ? (
                  <div style={{ marginTop: '0.9rem' }}>
                    <p style={{ fontSize: '0.9rem', margin: '0 0 0.6rem' }}>
                      Código de seguimiento: <strong>{detalle.tracking_code}</strong>
                    </p>
                    <Boton variante="primario" onClick={verSeguimiento}>
                      <IconoPaquete size={18} /> Seguir pedido
                    </Boton>
                  </div>
                ) : tieneTrackingVisible(detalle.estado) ? (
                  <Alerta tipo="aviso">
                    El código de seguimiento aún no está disponible. Te avisamos por correo cuando esté listo.
                  </Alerta>
                ) : (
                  <Alerta tipo="aviso">Este pedido aún no fue despachado. Te avisamos cuando esté en camino.</Alerta>
                )}
              </div>
            ) : null}
          </>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => setVista('detalle')}
              style={{ background: 'none', border: 'none', color: 'var(--marca)', cursor: 'pointer', padding: 0, marginBottom: '0.9rem' }}
            >
              ‹ Volver al detalle
            </button>

            {seguimientoEstado === 'cargando' ? <EstadoCarga>Consultando el estado del envío…</EstadoCarga> : null}
            {seguimientoEstado === 'error' ? (
              <EstadoError titulo="No pudimos cargar el seguimiento">
                {seguimientoError}
                <br />
                <Boton variante="primario" onClick={verSeguimiento} style={{ marginTop: '0.8rem' }}>
                  Reintentar
                </Boton>
              </EstadoError>
            ) : null}
            {seguimientoEstado === 'ok' && seguimiento ? (
              <div>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Insignia variante={etiquetaEstadoTracking(seguimiento.estado_actual).variante}>
                    {etiquetaEstadoTracking(seguimiento.estado_actual).etiqueta}
                  </Insignia>
                  {seguimiento.desde_cache ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--tinta-suave)' }}>Último estado conocido</span>
                  ) : null}
                </p>

                {seguimiento.fecha_estimada_entrega ? (
                  <div className="dato">
                    <span className="dato__k">Entrega estimada</span>
                    <span className="dato__v">{fechaCorta(seguimiento.fecha_estimada_entrega)}</span>
                  </div>
                ) : null}
                {seguimiento.direccion_entrega ? (
                  <div className="dato">
                    <span className="dato__k">Dirección</span>
                    <span className="dato__v">{seguimiento.direccion_entrega}</span>
                  </div>
                ) : null}

                {seguimiento.eventos.length > 0 ? (
                  <ul className="linea-tiempo">
                    {seguimiento.eventos.map((e, i) => (
                      <li key={i}>
                        {e.fecha ? <div className="linea-tiempo__fecha">{fechaHoraCorta(e.fecha)}</div> : null}
                        <div className="linea-tiempo__desc">{e.descripcion}</div>
                        {e.ubicacion ? <div className="linea-tiempo__ubicacion">{e.ubicacion}</div> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: 'var(--tinta-suave)' }}>No hay eventos de seguimiento disponibles en este momento.</p>
                )}

                <Boton variante="fantasma" onClick={verSeguimiento} style={{ marginTop: '1rem' }}>
                  ↻ Actualizar
                </Boton>
              </div>
            ) : null}
          </div>
        )}
      </Dialogo>
    </>
  );
}
