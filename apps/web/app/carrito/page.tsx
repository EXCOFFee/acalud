'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alerta } from '@/components/ui';
import { precioARS, SiteNav } from '@/components/site-nav';
import { api, ApiError, type CarritoView } from '@/lib/api';

export default function CarritoPage() {
  const router = useRouter();
  const [carrito, setCarrito] = useState<CarritoView | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    api
      .verCarrito()
      .then((c) => {
        setCarrito(c);
        setEstado('ok');
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/carrito');
        else setEstado('error');
      });
  }, [router]);

  async function accion(fn: () => Promise<CarritoView>): Promise<void> {
    setOcupado(true);
    try {
      setCarrito(await fn());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/carrito');
      else setEstado('error');
    } finally {
      setOcupado(false);
    }
  }

  const cambiarCantidad = (juegoId: string, cantidad: number): Promise<void> =>
    accion(() => api.ponerLinea(juegoId, cantidad));
  const quitar = (juegoId: string): Promise<void> => accion(() => api.quitarLinea(juegoId));

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem' }}>
        <p className="eyebrow">Carrito</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', margin: '0.3rem 0 1rem' }}>Tu carrito</h1>

        {estado === 'cargando' ? <p className="estado-carga">Cargando…</p> : null}
        {estado === 'error' ? <Alerta tipo="error">No pudimos cargar el carrito.</Alerta> : null}

        {estado === 'ok' && carrito ? (
          carrito.lineas.length === 0 ? (
            <p className="estado-carga">
              Tu carrito está vacío. <Link href="/catalogo">Ver catálogo</Link>.
            </p>
          ) : (
            <>
              <ul className="lista-recursos" style={{ gap: '0.7rem' }}>
                {carrito.lineas.map((l) => (
                  <li key={l.juego_id} style={{ flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '12rem' }}>
                      <strong>{l.nombre}</strong>
                      <div className="juego__meta">
                        {precioARS(l.precio_unitario)} c/u
                        {l.descuento_pct > 0 ? (
                          <span className="chip" style={{ marginLeft: '0.4rem' }}>
                            −{l.descuento_pct}%
                          </span>
                        ) : null}
                        {!l.disponible ? (
                          <span className="chip chip--off" style={{ marginLeft: '0.4rem' }}>
                            sin stock suficiente
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        className="boton boton--fantasma"
                        type="button"
                        aria-label="Restar uno"
                        disabled={ocupado || l.cantidad <= 1}
                        onClick={() => cambiarCantidad(l.juego_id, l.cantidad - 1)}
                      >
                        −
                      </button>
                      <span style={{ minWidth: '2ch', textAlign: 'center' }}>{l.cantidad}</span>
                      <button
                        className="boton boton--fantasma"
                        type="button"
                        aria-label="Sumar uno"
                        disabled={ocupado || l.cantidad >= 99}
                        onClick={() => cambiarCantidad(l.juego_id, l.cantidad + 1)}
                      >
                        +
                      </button>
                      <strong style={{ minWidth: '6rem', textAlign: 'right' }}>
                        {precioARS(l.subtotal)}
                      </strong>
                      <button
                        className="boton boton--fantasma"
                        type="button"
                        disabled={ocupado}
                        onClick={() => quitar(l.juego_id)}
                      >
                        Quitar
                      </button>
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
                    <span className="chip chip--ok">Ahorrás {precioARS(carrito.ahorro_total)}</span>
                  ) : null}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="juego__meta">Total</div>
                  <div className="ficha__precio" style={{ margin: 0 }}>
                    {precioARS(carrito.total)}
                  </div>
                </div>
              </div>

              <Link
                className="boton boton--primario boton--bloque"
                href="/checkout"
                style={{ marginTop: '1rem' }}
                aria-disabled={carrito.lineas.some((l) => !l.disponible)}
              >
                Finalizar compra
              </Link>
              {carrito.lineas.some((l) => !l.disponible) ? (
                <p className="juego__meta" style={{ marginTop: '0.4rem' }}>
                  Ajustá las cantidades sin stock antes de continuar.
                </p>
              ) : null}
            </>
          )
        ) : null}
      </main>
    </>
  );
}
