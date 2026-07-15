'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alerta } from '@/components/ui';
import { emojiArea, precioARS, SiteNav } from '@/components/site-nav';
import { api, ApiError, type JuegoDetalle } from '@/lib/api';

const FORMATO: Record<string, string> = { html5: 'interactiva', pdf: 'PDF', video: 'video' };

export default function FichaJuegoPage() {
  const router = useRouter();
  const [juego, setJuego] = useState<JuegoDetalle | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error' | 'no-encontrado'>('cargando');
  const [cantidad, setCantidad] = useState(1);
  const [agregando, setAgregando] = useState(false);
  const [agregado, setAgregado] = useState(false);
  const [errorCarrito, setErrorCarrito] = useState<string | null>(null);

  async function agregarAlCarrito(): Promise<void> {
    if (!juego) return;
    setAgregando(true);
    setErrorCarrito(null);
    setAgregado(false);
    try {
      await api.ponerLinea(juego.id, cantidad);
      setAgregado(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?volver=/carrito');
      } else {
        setErrorCarrito('No pudimos agregar al carrito. Probá de nuevo.');
      }
    } finally {
      setAgregando(false);
    }
  }

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
      setEstado('no-encontrado');
      return;
    }
    api
      .verJuego(id)
      .then((j) => {
        setJuego(j);
        setEstado('ok');
      })
      .catch((err: { status?: number }) => setEstado(err?.status === 404 ? 'no-encontrado' : 'error'));
  }, []);

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2rem' }}>
        <Link href="/catalogo" style={{ fontSize: '0.9rem' }}>
          ← Volver al catálogo
        </Link>

        {estado === 'cargando' ? <p className="estado-carga">Cargando…</p> : null}
        {estado === 'error' ? (
          <div style={{ marginTop: '1.2rem' }}>
            <Alerta tipo="error">No pudimos cargar el juego. Probá de nuevo.</Alerta>
          </div>
        ) : null}
        {estado === 'no-encontrado' ? (
          <div style={{ marginTop: '1.2rem' }}>
            <Alerta tipo="aviso">Ese juego no existe o no está disponible.</Alerta>
          </div>
        ) : null}

        {estado === 'ok' && juego ? (
          <article className="ficha">
            <div className="thumb" aria-hidden="true">
              {emojiArea(juego.area)}
            </div>

            <div>
              <p className="eyebrow" style={{ margin: 0 }}>
                {[juego.area, juego.edad_objetivo].filter(Boolean).join(' · ')}
              </p>
              <h1 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.5rem)', margin: '0.2rem 0 0.4rem' }}>
                {juego.nombre}
              </h1>
              <p className="ficha__precio">{precioARS(juego.precio_lista)}</p>

              <p style={{ marginBottom: '0.7rem' }}>
                {juego.stock_disponible ? (
                  <span className="chip chip--ok">● En stock</span>
                ) : (
                  <span className="chip chip--off">● Sin stock</span>
                )}
              </p>

              <p style={{ color: 'var(--tinta-suave)', lineHeight: 1.6 }}>{juego.descripcion}</p>

              {juego.stock_disponible ? (
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label htmlFor="cantidad" className="juego__meta">
                    Cantidad
                  </label>
                  <input
                    id="cantidad"
                    type="number"
                    min={1}
                    max={99}
                    value={cantidad}
                    onChange={(e) =>
                      setCantidad(Math.max(1, Math.min(99, Number(e.target.value) || 1)))
                    }
                    style={{
                      width: '4.5rem',
                      padding: '0.5rem',
                      border: '1px solid var(--borde)',
                      borderRadius: 'var(--r-sm)',
                      background: 'var(--superficie)',
                      color: 'var(--tinta)',
                      font: 'inherit',
                    }}
                  />
                  <button
                    className="boton boton--primario"
                    type="button"
                    onClick={agregarAlCarrito}
                    disabled={agregando}
                    style={{ flex: 1, minWidth: '10rem' }}
                  >
                    {agregando ? 'Agregando…' : 'Agregar al carrito'}
                  </button>
                </div>
              ) : (
                <button className="boton boton--primario boton--bloque" type="button" disabled>
                  Sin stock
                </button>
              )}
              {agregado ? (
                <div style={{ marginTop: '0.7rem' }}>
                  <Alerta tipo="ok">
                    Agregado al carrito. <Link href="/carrito">Ver carrito</Link>.
                  </Alerta>
                </div>
              ) : null}
              {errorCarrito ? (
                <div style={{ marginTop: '0.7rem' }}>
                  <Alerta tipo="error">{errorCarrito}</Alerta>
                </div>
              ) : null}

              {juego.demos.length > 0 ? (
                <p style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                  {juego.demos.map((d, i) => (
                    <span className="chip" key={i}>
                      ▶ Demo {d.tipo === 'publica' ? 'pública' : 'completa'} · {FORMATO[d.formato] ?? d.formato}
                    </span>
                  ))}
                </p>
              ) : null}

              {juego.tramos.length > 0 ? (
                <section style={{ marginTop: '1.3rem' }}>
                  <h2 style={{ fontSize: '1.05rem', margin: '0 0 0.3rem' }}>Descuentos por cantidad</h2>
                  <table className="tabla-tramos">
                    <thead>
                      <tr>
                        <th>Desde (unidades)</th>
                        <th>Descuento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {juego.tramos.map((t) => (
                        <tr key={t.cantidad_minima}>
                          <td>{t.cantidad_minima}</td>
                          <td>{t.descuento_pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ) : null}

              {juego.recursos.length > 0 ? (
                <section style={{ marginTop: '1.3rem' }}>
                  <h2 style={{ fontSize: '1.05rem', margin: '0 0 0.3rem' }}>Recursos</h2>
                  <ul className="lista-recursos">
                    {juego.recursos.map((r) => (
                      <li key={r.id}>
                        <span>{r.nombre}</span>
                        {r.desbloqueado ? (
                          <span className="chip chip--ok">Libre</span>
                        ) : (
                          <span className="chip">🔒 Con compra</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </article>
        ) : null}
      </main>
    </>
  );
}
