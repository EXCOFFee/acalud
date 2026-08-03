'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { Alerta, Boton, Dialogo, EstadoCarga, EstadoError, EstadoVacio } from '@/components/ui';
import { BotonFavorito } from '@/components/favorito-boton';
import { SiteNav } from '@/components/site-nav';
import { api, type EditorialDetalle, type EditorialResumen, type FavoritoResumen } from '@/lib/api';

export default function EditorialesPage() {
  const [editoriales, setEditoriales] = useState<EditorialResumen[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [texto, setTexto] = useState('');
  const [categoria, setCategoria] = useState<string | undefined>(undefined);

  const [logueado, setLogueado] = useState<boolean | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<EditorialDetalle | null>(null);
  const [detalleEstado, setDetalleEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [retencionAbierta, setRetencionAbierta] = useState(false);

  // CU-18: favoritos ya guardados (vacío si es anónimo, RN-008).
  const [favoritos, setFavoritos] = useState<FavoritoResumen[]>([]);
  const favoritoEditorial = detalle ? favoritos.find((f) => f.tipo === 'editorial_partner' && f.item_id === detalle.id)?.id ?? null : null;

  useEffect(() => {
    api
      .me()
      .then(() => setLogueado(true))
      .catch(() => setLogueado(false));
    api.misFavoritos().then(setFavoritos).catch(() => setFavoritos([]));
  }, []);

  // A partir de /editoriales?id=... (deep link, ej. desde "Mis favoritos"), abre el detalle directo.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) abrirDetalle(id);
  }, []);

  useEffect(() => {
    let vivo = true;
    setEstado('cargando');
    api
      .listarEditoriales(categoria)
      .then((r) => {
        if (!vivo) return;
        setEditoriales(r);
        setEstado('ok');
      })
      .catch(() => vivo && setEstado('error'));
    return () => {
      vivo = false;
    };
  }, [categoria]);

  function buscar(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setCategoria(texto.trim() || undefined);
  }

  async function abrirDetalle(id: string): Promise<void> {
    setDetalleId(id);
    setDetalle(null);
    setDetalleEstado('cargando');
    try {
      // GET /editorial-partners/:id ya registra editorial_partner_viewed server-side (RN-006).
      const d = await api.verEditorial(id);
      setDetalle(d);
      setDetalleEstado('ok');
    } catch {
      setDetalleEstado('error');
    }
  }

  function irAlSitio(): void {
    if (!detalle?.sitio_web) return;
    api.clickEditorial(detalle.id).catch(() => {}); // A1/A2/RN-007: no bloquea la navegación si falla
    window.open(detalle.sitio_web, '_blank', 'noopener,noreferrer'); // RNF-007
  }

  function alHacerClicIrAlSitio(): void {
    // A2/RN-004: usuario anónimo → modal de retención antes de salir.
    if (logueado === false) {
      setRetencionAbierta(true);
      return;
    }
    irAlSitio();
  }

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.5rem' }}>
        <p className="eyebrow">Editoriales</p>
        <h1 style={{ fontSize: 'clamp(1.9rem, 5vw, 2.8rem)', margin: '0.3rem 0 0.2rem' }}>Editoriales aliadas</h1>
        <p style={{ color: 'var(--tinta-suave)', maxWidth: '52ch', margin: 0 }}>
          Conocé a las editoriales que hacen posible el catálogo de Acalud.
        </p>

        <form className="filtros" onSubmit={buscar} role="search">
          <input
            type="search"
            aria-label="Filtrar por categoría"
            placeholder="Filtrar por categoría (ej: Juegos de Mesa)…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <button className="boton boton--primario" type="submit">
            Buscar
          </button>
          {categoria ? (
            <button
              className="boton boton--fantasma"
              type="button"
              onClick={() => {
                setTexto('');
                setCategoria(undefined);
              }}
            >
              Todas las editoriales
            </button>
          ) : null}
        </form>

        {estado === 'cargando' ? <EstadoCarga>Cargando editoriales…</EstadoCarga> : null}
        {estado === 'error' ? (
          <EstadoError titulo="No pudimos cargar las editoriales aliadas">
            <Boton variante="primario" onClick={() => setCategoria((c) => c)}>
              Reintentar
            </Boton>
          </EstadoError>
        ) : null}
        {estado === 'ok' && editoriales.length === 0 ? (
          <EstadoVacio icono="🏢" titulo="Pronto tendremos nuevas editoriales aliadas">
            ¡Vuelve a visitarnos!
          </EstadoVacio>
        ) : null}

        {estado === 'ok' && editoriales.length > 0 ? (
          <div className="catalogo-grid">
            {editoriales.map((e) => (
              <div key={e.id} className="juego" style={{ cursor: 'default' }}>
                <div className="thumb" aria-hidden="true">
                  {e.logo_url ? (
                    <img src={e.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '1rem' }} />
                  ) : (
                    '🏢'
                  )}
                </div>
                <div className="juego__cuerpo">
                  <span className="juego__nombre">{e.nombre}</span>
                  <span className="juego__meta" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {e.descripcion}
                  </span>
                  <div className="juego__pie">
                    <Boton variante="fantasma" bloque onClick={() => abrirDetalle(e.id)}>
                      Ver más
                    </Boton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </main>

      <Dialogo
        abierto={detalleId !== null}
        onCerrar={() => setDetalleId(null)}
        titulo={detalle?.nombre ?? 'Editorial'}
      >
        {detalleEstado === 'cargando' ? <EstadoCarga>Cargando…</EstadoCarga> : null}
        {detalleEstado === 'error' ? (
          <EstadoError titulo="No pudimos cargar esta editorial">
            La editorial que buscás no está disponible.
          </EstadoError>
        ) : null}
        {detalleEstado === 'ok' && detalle ? (
          <div>
            {detalle.logo_url ? (
              <img
                src={detalle.logo_url}
                alt=""
                style={{ maxWidth: '100%', maxHeight: '7rem', objectFit: 'contain', marginBottom: '0.9rem' }}
              />
            ) : null}
            {detalle.categoria ? <p className="eyebrow" style={{ margin: '0 0 0.3rem' }}>{detalle.categoria}</p> : null}
            <p style={{ color: 'var(--tinta-suave)', lineHeight: 1.6 }}>{detalle.descripcion}</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {detalle.sitio_web ? (
                <Boton variante="primario" onClick={alHacerClicIrAlSitio}>
                  Ir al sitio web ↗
                </Boton>
              ) : null}
              <BotonFavorito
                tipo="editorial"
                itemId={detalle.id}
                favoritoId={favoritoEditorial}
                onCambio={(id) =>
                  setFavoritos((actual) => {
                    const sinEsta = actual.filter((f) => !(f.tipo === 'editorial_partner' && f.item_id === detalle.id));
                    return id === null
                      ? sinEsta
                      : [...sinEsta, { id, tipo: 'editorial_partner' as const, item_id: detalle.id, titulo: detalle.nombre, creado_en: '' }];
                  })
                }
              />
            </div>
            {!detalle.sitio_web ? (
              <div style={{ marginTop: '0.6rem' }}>
                <Alerta tipo="aviso">Esta editorial no tiene sitio web disponible en este momento.</Alerta>
              </div>
            ) : null}
          </div>
        ) : null}
      </Dialogo>

      {/* A2/RN-004/RN-005: modal de retención para usuarios anónimos. */}
      <Dialogo
        abierto={retencionAbierta}
        onCerrar={() => setRetencionAbierta(false)}
        titulo="Antes de irte…"
        acciones={
          <>
            <Boton
              variante="fantasma"
              onClick={() => {
                setRetencionAbierta(false);
                irAlSitio();
              }}
            >
              Continuar al sitio web
            </Boton>
            <Boton variante="primario" href="/registro">
              Registrarme ahora
            </Boton>
          </>
        }
      >
        <p>
          Unite a nuestra comunidad para recibir ofertas exclusivas de estas marcas. ¡Es gratis!
        </p>
      </Dialogo>
    </>
  );
}
