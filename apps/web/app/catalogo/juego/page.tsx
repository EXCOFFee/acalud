'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alerta, Boton, Dialogo } from '@/components/ui';
import { BotonFavorito } from '@/components/favorito-boton';
import { emojiArea, precioARS, SiteNav } from '@/components/site-nav';
import { api, ApiError, type ContenidoDemo, type FavoritoResumen, type JuegoDetalle } from '@/lib/api';

const FORMATO: Record<string, string> = { html5: 'interactiva', pdf: 'PDF', video: 'video' };

export default function FichaJuegoPage() {
  const router = useRouter();
  const [juego, setJuego] = useState<JuegoDetalle | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error' | 'no-encontrado'>('cargando');
  const [cantidad, setCantidad] = useState(1);
  const [agregando, setAgregando] = useState(false);
  const [agregado, setAgregado] = useState(false);
  const [errorCarrito, setErrorCarrito] = useState<string | null>(null);

  // CU-24: solo el encargado institucional ve la opción de comprar para su institución.
  const [institucionId, setInstitucionId] = useState<string | null>(null);
  const [agregandoInstitucional, setAgregandoInstitucional] = useState(false);
  const [agregadoInstitucional, setAgregadoInstitucional] = useState(false);
  const [errorCarritoInstitucional, setErrorCarritoInstitucional] = useState<string | null>(null);

  // CU-06/CU-07: probar demo pública o completa.
  const [demo, setDemo] = useState<ContenidoDemo | null>(null);
  const [demoCargando, setDemoCargando] = useState<'publica' | 'completa' | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);

  // CU-08/CU-09: descargar un recurso (libre o licenciado, ya resuelto por `desbloqueado`).
  const [descargando, setDescargando] = useState<string | null>(null);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  // CU-18: favoritos ya guardados por el usuario (vacío si es anónimo, RN-008).
  const [favoritos, setFavoritos] = useState<FavoritoResumen[]>([]);
  const favoritoDe = (tipo: 'product' | 'resource', itemId: string): string | null =>
    favoritos.find((f) => f.tipo === tipo && f.item_id === itemId)?.id ?? null;
  function alCambiarFavorito(tipo: 'product' | 'resource', itemId: string, favoritoId: string | null): void {
    setFavoritos((actual) => {
      const sinEste = actual.filter((f) => !(f.tipo === tipo && f.item_id === itemId));
      return favoritoId === null
        ? sinEste
        : [...sinEste, { id: favoritoId, tipo, item_id: itemId, titulo: '', creado_en: '' }];
    });
  }

  async function descargar(recursoId: string): Promise<void> {
    setErrorDescarga(null);
    setDescargando(recursoId);
    try {
      const r = await api.descargarRecurso(recursoId);
      window.open(r.url_firmada, '_blank', 'noopener,noreferrer');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace(`/login?volver=${encodeURIComponent(`/catalogo/juego?id=${juego?.id ?? ''}`)}`);
        return;
      }
      setErrorDescarga('No pudimos iniciar la descarga. Probá de nuevo.');
    } finally {
      setDescargando(null);
    }
  }

  async function probarDemo(tipo: 'publica' | 'completa'): Promise<void> {
    if (!juego) return;
    setDemoError(null);
    setDemoCargando(tipo);
    try {
      const d = tipo === 'publica' ? await api.probarDemoPublica(juego.id) : await api.probarDemoCompleta(juego.id);
      setDemo(d);
    } catch (err) {
      if (tipo === 'completa' && err instanceof ApiError && err.status === 401) {
        router.replace(`/login?volver=${encodeURIComponent(`/catalogo/juego?id=${juego.id}`)}`);
        return;
      }
      setDemoError('No pudimos cargar la demo. Probá de nuevo.');
    } finally {
      setDemoCargando(null);
    }
  }

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

  async function agregarAlCarritoInstitucional(): Promise<void> {
    if (!juego || !institucionId) return;
    setAgregandoInstitucional(true);
    setErrorCarritoInstitucional(null);
    setAgregadoInstitucional(false);
    try {
      await api.ponerLinea(juego.id, cantidad, institucionId);
      setAgregadoInstitucional(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?volver=/institucion/carrito');
      } else {
        setErrorCarritoInstitucional(
          'Error de conexión. No se pudo agregar el producto al carrito institucional. Intentá nuevamente más tarde.',
        );
      }
    } finally {
      setAgregandoInstitucional(false);
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
    api.misFavoritos().then(setFavoritos).catch(() => setFavoritos([])); // anónimo → sin favoritos (RN-008)
    // CU-24: si es encargado institucional, habilita "Agregar a compra institucional".
    api
      .miInstitucion()
      .then((mia) => setInstitucionId(mia.es_encargado ? mia.institucion_id : null))
      .catch(() => setInstitucionId(null));
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
            {juego.imagen_url ? (
              <div className="thumb thumb--imagen">
                <img src={juego.imagen_url} alt="" />
              </div>
            ) : (
              <div className="thumb" aria-hidden="true">
                {emojiArea(juego.area)}
              </div>
            )}

            <div>
              <p className="eyebrow" style={{ margin: 0 }}>
                {juego.area}
              </p>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', margin: '0.2rem 0 0.4rem' }}>
                <h1 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.5rem)', margin: 0 }}>{juego.nombre}</h1>
                <BotonFavorito
                  tipo="producto"
                  itemId={juego.id}
                  favoritoId={favoritoDe('product', juego.id)}
                  onCambio={(id) => alCambiarFavorito('product', juego.id, id)}
                />
              </div>
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
                  {institucionId ? (
                    <Boton variante="fantasma" onClick={agregarAlCarritoInstitucional} cargando={agregandoInstitucional}>
                      🏫 Agregar a compra institucional
                    </Boton>
                  ) : null}
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
              {agregadoInstitucional ? (
                <div style={{ marginTop: '0.7rem' }}>
                  <Alerta tipo="ok">
                    Agregado a la compra institucional. <Link href="/institucion/carrito">Ver carrito institucional</Link>.
                  </Alerta>
                </div>
              ) : null}
              {errorCarritoInstitucional ? (
                <div style={{ marginTop: '0.7rem' }}>
                  <Alerta tipo="error">{errorCarritoInstitucional}</Alerta>
                </div>
              ) : null}

              {juego.demos.length > 0 ? (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                  {juego.demos.map((d, i) => (
                    <Boton
                      key={i}
                      variante="fantasma"
                      cargando={demoCargando === d.tipo}
                      onClick={() => probarDemo(d.tipo as 'publica' | 'completa')}
                    >
                      ▶ Probar demo {d.tipo === 'publica' ? 'pública' : 'completa'} ({FORMATO[d.formato] ?? d.formato})
                    </Boton>
                  ))}
                </div>
              ) : null}
              {demoError ? (
                <div style={{ marginTop: '0.6rem' }}>
                  <Alerta tipo="error">{demoError}</Alerta>
                </div>
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
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {r.desbloqueado ? (
                            <Boton variante="fantasma" cargando={descargando === r.id} onClick={() => descargar(r.id)}>
                              ⬇ Descargar
                            </Boton>
                          ) : (
                            <span className="chip">🔒 Con compra</span>
                          )}
                          <BotonFavorito
                            tipo="recurso"
                            itemId={r.id}
                            favoritoId={favoritoDe('resource', r.id)}
                            onCambio={(id) => alCambiarFavorito('resource', r.id, id)}
                          />
                        </span>
                      </li>
                    ))}
                  </ul>
                  {errorDescarga ? (
                    <div style={{ marginTop: '0.6rem' }}>
                      <Alerta tipo="error">{errorDescarga}</Alerta>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </div>
          </article>
        ) : null}
      </main>

      <Dialogo
        abierto={demo !== null}
        onCerrar={() => setDemo(null)}
        titulo={demo ? `Demo ${demo.tipo === 'publica' ? 'pública' : 'completa'}` : 'Demo'}
        ancho="ancho"
      >
        {demo ? (
          demo.formato === 'video' ? (
            <video
              src={demo.urlEmbebido}
              controls
              style={{ width: '100%', borderRadius: 'var(--r)', display: 'block' }}
            />
          ) : (
            <iframe
              src={demo.urlEmbebido}
              title={`Demo ${demo.tipo} del juego`}
              style={{ width: '100%', aspectRatio: '16 / 10', border: 'none', borderRadius: 'var(--r)' }}
              allow="fullscreen"
            />
          )
        ) : null}
      </Dialogo>
    </>
  );
}
