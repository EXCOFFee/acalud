'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alerta, Boton, EstadoCarga, EstadoError, EstadoVacio, Insignia } from '@/components/ui';
import { precioARS, SiteNav } from '@/components/site-nav';
import { api, ApiError, type CarritoView } from '@/lib/api';

export default function CarritoInstitucionalPage() {
  const router = useRouter();
  const [institucionId, setInstitucionId] = useState<string | null>(null);
  const [carrito, setCarrito] = useState<CarritoView | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'sin-permiso' | 'error'>('cargando');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    api
      .miInstitucion()
      .then((mia) => {
        if (mia.institucion_id === null) {
          router.replace('/institucion');
          return;
        }
        if (!mia.es_encargado) {
          setEstado('sin-permiso');
          return;
        }
        setInstitucionId(mia.institucion_id);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/institucion/carrito');
        else setEstado('error');
      });
  }, [router]);

  useEffect(() => {
    if (!institucionId) return;
    api
      .verCarrito(institucionId)
      .then((c) => {
        setCarrito(c);
        setEstado('ok');
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/institucion/carrito');
        else if (err instanceof ApiError && err.status === 404) setEstado('sin-permiso');
        else setEstado('error');
      });
  }, [institucionId, router]);

  async function accion(fn: () => Promise<CarritoView>): Promise<void> {
    setOcupado(true);
    try {
      setCarrito(await fn());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/institucion/carrito');
      else setEstado('error');
    } finally {
      setOcupado(false);
    }
  }

  const cambiarCantidad = (juegoId: string, cantidad: number): Promise<void> =>
    accion(() => api.ponerLinea(juegoId, cantidad, institucionId ?? undefined));
  const quitar = (juegoId: string): Promise<void> => accion(() => api.quitarLinea(juegoId, institucionId ?? undefined));

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem' }}>
        <p className="eyebrow">Institución</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', margin: '0.3rem 0 1.2rem' }}>
          Carrito institucional
        </h1>

        {estado === 'cargando' ? <EstadoCarga>Cargando carrito institucional…</EstadoCarga> : null}

        {estado === 'sin-permiso' ? (
          <Alerta tipo="aviso">
            Solo los encargados institucionales pueden realizar compras en lote. Contactá a tu
            encargado para solicitar permisos.
          </Alerta>
        ) : null}

        {estado === 'error' ? (
          <EstadoError titulo="No pudimos cargar el carrito institucional">
            <Boton variante="primario" onClick={() => setEstado('cargando')}>
              Reintentar
            </Boton>
          </EstadoError>
        ) : null}

        {estado === 'ok' && carrito && carrito.lineas.length === 0 ? (
          <EstadoVacio
            icono="🛒"
            titulo="El carrito institucional está vacío"
            accion={
              <Boton variante="primario" href="/catalogo">
                Ir al catálogo
              </Boton>
            }
          >
            Buscá juegos en el catálogo y usá "Agregar a compra institucional" en la ficha de cada
            uno.
          </EstadoVacio>
        ) : null}

        {estado === 'ok' && carrito && carrito.lineas.length > 0 ? (
          <>
            <ul className="lista-recursos" style={{ gap: '0.7rem' }}>
              {carrito.lineas.map((l) => (
                <li key={l.juego_id} style={{ flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '12rem' }}>
                    <strong>{l.nombre}</strong>
                    <div className="juego__meta">
                      {precioARS(l.precio_unitario)} c/u
                      {l.descuento_pct > 0 ? (
                        <Insignia variante="ok">−{l.descuento_pct}%</Insignia>
                      ) : null}
                      {!l.disponible ? <Insignia variante="off">sin stock suficiente</Insignia> : null}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Boton
                      variante="fantasma"
                      aria-label="Restar uno"
                      disabled={ocupado || l.cantidad <= 1}
                      onClick={() => cambiarCantidad(l.juego_id, l.cantidad - 1)}
                    >
                      −
                    </Boton>
                    <span style={{ minWidth: '2ch', textAlign: 'center' }}>{l.cantidad}</span>
                    <Boton
                      variante="fantasma"
                      aria-label="Sumar uno"
                      disabled={ocupado || l.cantidad >= 99}
                      onClick={() => cambiarCantidad(l.juego_id, l.cantidad + 1)}
                    >
                      +
                    </Boton>
                    <strong style={{ minWidth: '6rem', textAlign: 'right' }}>{precioARS(l.subtotal)}</strong>
                    <Boton variante="fantasma" disabled={ocupado} onClick={() => quitar(l.juego_id)}>
                      Quitar
                    </Boton>
                  </div>
                </li>
              ))}
            </ul>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginTop: '1.3rem',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div>
                {carrito.ahorro_total > 0 ? (
                  <Insignia variante="ok">Ahorrás {precioARS(carrito.ahorro_total)}</Insignia>
                ) : null}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="juego__meta">Total</div>
                <div className="ficha__precio" style={{ margin: 0 }}>
                  {precioARS(carrito.total)}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <Boton
                variante="primario"
                bloque
                href="/institucion/checkout"
                disabled={carrito.lineas.some((l) => !l.disponible)}
              >
                Finalizar compra institucional
              </Boton>
            </div>
            {carrito.lineas.some((l) => !l.disponible) ? (
              <p className="juego__meta" style={{ marginTop: '0.4rem' }}>
                Ajustá las cantidades sin stock antes de continuar.
              </p>
            ) : null}
          </>
        ) : null}
      </main>
    </>
  );
}
