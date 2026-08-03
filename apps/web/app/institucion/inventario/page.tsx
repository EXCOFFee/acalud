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
  Insignia,
  Selector,
  Tabla,
  type ColumnaTabla,
} from '@/components/ui';
import { precioARS, SiteNav } from '@/components/site-nav';
import { fechaCorta } from '@/lib/pedidos';
import {
  api,
  ApiError,
  type DetalleProductoInventario,
  type FiltroInventario,
  type InventarioInstitucional,
  type ItemInventarioInstitucional,
  type OrdenInventario,
} from '@/lib/api';

export default function InventarioInstitucionalPage() {
  const router = useRouter();
  const [institucionId, setInstitucionId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroInventario>({ orden: 'nombre', direccion: 'asc' });
  const [inventario, setInventario] = useState<InventarioInstitucional | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'sin-permiso' | 'error'>('cargando');

  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<DetalleProductoInventario | null>(null);
  const [detalleEstado, setDetalleEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

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

  async function abrirDetalle(productoId: string): Promise<void> {
    if (!institucionId) return;
    setDetalleId(productoId);
    setDetalle(null);
    setDetalleEstado('cargando');
    try {
      const d = await api.verDetalleInventario(institucionId, productoId);
      setDetalle(d);
      setDetalleEstado('ok');
    } catch {
      setDetalleEstado('error');
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
              <Boton variante="primario" href="/catalogo">
                Ir al catálogo
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

      <Dialogo
        abierto={detalleId !== null}
        onCerrar={() => setDetalleId(null)}
        titulo={detalle?.nombre_producto ?? 'Detalle del producto'}
      >
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
              <p style={{ color: 'var(--tinta-suave)', fontSize: '0.9rem' }}>Ningún docente tiene asignado este producto.</p>
            ) : (
              <ul className="lista-recursos">
                {detalle.docentes.map((d, i) => (
                  <li key={i}>
                    <span>
                      {d.nombre} · {d.cantidad} unidades
                    </span>
                    <Insignia variante={d.estado === 'active' ? 'ok' : 'off'}>
                      {d.estado === 'active' ? 'Activa' : 'Revocada'}
                    </Insignia>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </Dialogo>
    </>
  );
}
