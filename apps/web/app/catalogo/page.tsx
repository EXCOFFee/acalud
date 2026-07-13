'use client';

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Alerta } from '@/components/ui';
import { emojiArea, precioARS, SiteNav } from '@/components/site-nav';
import { api, type JuegoResumen } from '@/lib/api';

const AREAS = ['Matemática', 'Lengua', 'Ciencias Naturales', 'Ciencias Sociales', 'Programación'];

export default function CatalogoPage() {
  const [juegos, setJuegos] = useState<JuegoResumen[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [texto, setTexto] = useState(''); // lo que se tipea
  const [filtros, setFiltros] = useState<{ q?: string | undefined; area?: string | undefined }>({}); // lo aplicado

  useEffect(() => {
    let vigente = true;
    setEstado('cargando');
    api
      .listarJuegos(filtros)
      .then((r) => {
        if (vigente) {
          setJuegos(r.datos);
          setEstado('ok');
        }
      })
      .catch(() => vigente && setEstado('error'));
    return () => {
      vigente = false;
    };
  }, [filtros]);

  function buscar(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setFiltros((f) => ({ ...f, q: texto.trim() || undefined }));
  }

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.5rem' }}>
        <p className="eyebrow">Catálogo</p>
        <h1 style={{ fontSize: 'clamp(1.9rem, 5vw, 2.8rem)', margin: '0.3rem 0 0.2rem' }}>
          Juegos para el aula
        </h1>
        <p style={{ color: 'var(--tinta-suave)', maxWidth: '52ch', margin: 0 }}>
          Elegí por área y edad. Cada juego trae su ficha con demos y recursos.
        </p>

        <form className="filtros" onSubmit={buscar} role="search">
          <input
            type="search"
            aria-label="Buscar juegos"
            placeholder="Buscar por nombre…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <select
            aria-label="Filtrar por área"
            value={filtros.area ?? ''}
            onChange={(e) =>
              setFiltros((f) => ({ ...f, area: e.target.value || undefined }))
            }
          >
            <option value="">Todas las áreas</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button className="boton boton--primario" type="submit">
            Buscar
          </button>
        </form>

        {estado === 'cargando' ? <p className="estado-carga">Cargando juegos…</p> : null}
        {estado === 'error' ? (
          <div style={{ marginTop: '1.5rem' }}>
            <Alerta tipo="error">No pudimos cargar el catálogo. Probá de nuevo en un rato.</Alerta>
          </div>
        ) : null}
        {estado === 'ok' && juegos.length === 0 ? (
          <p className="estado-carga">No encontramos juegos con esos filtros.</p>
        ) : null}

        {estado === 'ok' && juegos.length > 0 ? (
          <div className="catalogo-grid">
            {juegos.map((j) => (
              <Link key={j.id} className="juego" href={`/catalogo/juego?id=${j.id}`}>
                <div className="thumb" aria-hidden="true">
                  {emojiArea(j.area)}
                </div>
                <div className="juego__cuerpo">
                  <span className="juego__nombre">{j.nombre}</span>
                  <span className="juego__meta">
                    {[j.area, j.edad_objetivo].filter(Boolean).join(' · ')}
                  </span>
                  <div className="juego__pie">
                    <span className="juego__precio">{precioARS(j.precio_lista)}</span>
                    {j.tiene_demo_publica ? <span className="chip">▶ Demo</span> : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </main>
    </>
  );
}
