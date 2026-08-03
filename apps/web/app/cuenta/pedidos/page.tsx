'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Boton,
  Dialogo,
  EstadoCarga,
  EstadoError,
  EstadoVacio,
  Insignia,
  Paginacion,
  Selector,
  Tabla,
  type ColumnaTabla,
} from '@/components/ui';
import { precioARS, SiteNav } from '@/components/site-nav';
import { ESTADO_PEDIDO, fechaCorta, tieneTrackingVisible } from '@/lib/pedidos';
import {
  api,
  ApiError,
  type DetalleOrdenHistorial,
  type EstadoPedido,
  type FiltroPedidos,
  type OrdenHistorial,
  type ResultadoPaginado,
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
    try {
      const d = await api.verPedido(id);
      setDetalle(d);
      setDetalleEstado('ok');
    } catch {
      setDetalleEstado('error');
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
            icono="🛒"
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
        titulo={detalle ? `Pedido ${detalle.numero}` : 'Detalle del pedido'}
      >
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

            {tieneTrackingVisible(detalle.estado) && detalle.tracking_code ? (
              <p style={{ marginTop: '0.6rem', fontSize: '0.9rem' }}>
                Código de seguimiento: <strong>{detalle.tracking_code}</strong>
              </p>
            ) : null}
          </div>
        ) : null}
      </Dialogo>
    </>
  );
}
