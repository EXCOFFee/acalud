'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Boton,
  EstadoCarga,
  EstadoError,
  EstadoVacio,
  IconoFavorito,
  Insignia,
  Tabla,
  type ColumnaTabla,
} from '@/components/ui';
import { SiteNav } from '@/components/site-nav';
import { api, ApiError, type FavoritoResumen, type TipoFavorito } from '@/lib/api';

const ETIQUETA_TIPO: Record<TipoFavorito, string> = {
  product: 'Producto',
  resource: 'Recurso',
  editorial_partner: 'Editorial',
};

/** Los recursos no tienen página propia: se acceden desde la ficha del producto que los trae. */
function enlaceDe(f: FavoritoResumen): string | null {
  if (f.tipo === 'product') return `/catalogo/juego?id=${f.item_id}`;
  if (f.tipo === 'editorial_partner') return `/editoriales?id=${f.item_id}`;
  return null;
}

// A9: "Mis Favoritos" desde el perfil, con la acción inversa (A7) para quitar.
export default function FavoritosPage() {
  const router = useRouter();
  const [favoritos, setFavoritos] = useState<FavoritoResumen[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [quitando, setQuitando] = useState<string | null>(null);

  function cargar(): void {
    setEstado('cargando');
    api
      .misFavoritos()
      .then((r) => {
        setFavoritos(r);
        setEstado('ok');
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/cuenta/favoritos');
        else setEstado('error');
      });
  }

  useEffect(cargar, [router]);

  async function quitar(id: string): Promise<void> {
    setQuitando(id);
    try {
      await api.quitarFavorito(id);
      setFavoritos((actual) => actual.filter((f) => f.id !== id));
    } catch {
      /* el usuario puede reintentar con otro clic; no hace falta interrumpir la vista */
    } finally {
      setQuitando(null);
    }
  }

  const columnas: ColumnaTabla<FavoritoResumen>[] = [
    {
      clave: 'titulo',
      encabezado: 'Elemento',
      render: (f) => {
        const href = enlaceDe(f);
        return href ? <Link href={href}>{f.titulo}</Link> : f.titulo;
      },
    },
    {
      clave: 'tipo',
      encabezado: 'Tipo',
      render: (f) => <Insignia variante="neutra">{ETIQUETA_TIPO[f.tipo]}</Insignia>,
    },
    {
      clave: 'accion',
      encabezado: '',
      render: (f) => (
        <Boton variante="fantasma" cargando={quitando === f.id} onClick={() => quitar(f.id)}>
          Quitar
        </Boton>
      ),
    },
  ];

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem' }}>
        <p className="eyebrow">Tu cuenta</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', margin: '0.3rem 0 1.2rem' }}>Mis favoritos</h1>

        {estado === 'cargando' ? <EstadoCarga>Cargando tus favoritos…</EstadoCarga> : null}
        {estado === 'error' ? (
          <EstadoError titulo="No pudimos cargar tus favoritos">
            <Boton variante="primario" onClick={cargar}>
              Reintentar
            </Boton>
          </EstadoError>
        ) : null}
        {estado === 'ok' && favoritos.length === 0 ? (
          <EstadoVacio
            icono={<IconoFavorito size={40} />}
            titulo="Todavía no guardaste favoritos"
            accion={
              <Boton variante="primario" href="/catalogo">
                Ir al catálogo
              </Boton>
            }
          >
            Guardá productos, recursos y editoriales para encontrarlos rápido acá.
          </EstadoVacio>
        ) : null}
        {estado === 'ok' && favoritos.length > 0 ? (
          <Tabla columnas={columnas} filas={favoritos} claveFila={(f) => f.id} />
        ) : null}
      </main>
    </>
  );
}
