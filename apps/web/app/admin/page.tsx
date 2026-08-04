'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alerta, EstadoCarga } from '@/components/ui';
import { SiteNav } from '@/components/site-nav';
import { api, ApiError } from '@/lib/api';

/**
 * Hub del panel de administración. `es_admin` es un rol global de plataforma (distinto del
 * "encargado" institucional) — se completa con más enlaces a medida que se implementan las
 * unidades de F1-F6.
 */
export default function AdminPage() {
  const router = useRouter();
  const [esAdmin, setEsAdmin] = useState<boolean | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  useEffect(() => {
    api
      .me()
      .then((p) => {
        setEsAdmin(p.es_admin);
        setEstado('ok');
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/admin');
        else setEstado('error');
      });
  }, [router]);

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem' }}>
        <p className="eyebrow">Administración</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', margin: '0.3rem 0 1.2rem' }}>Panel de admin</h1>

        {estado === 'cargando' ? <EstadoCarga>Cargando…</EstadoCarga> : null}
        {estado === 'error' ? <Alerta tipo="error">No pudimos cargar tu perfil.</Alerta> : null}

        {estado === 'ok' && esAdmin === false ? (
          <Alerta tipo="aviso">No tenés permisos de administrador para acceder a esta sección.</Alerta>
        ) : null}

        {estado === 'ok' && esAdmin ? (
          <div className="tarjeta" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <Link className="boton boton--fantasma" href="/admin/categorias">
              🗂️ Categorías del catálogo
            </Link>
            <Link className="boton boton--fantasma" href="/admin/productos">
              🎲 Productos
            </Link>
          </div>
        ) : null}
      </main>
    </>
  );
}
