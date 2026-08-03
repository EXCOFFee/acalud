'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Boton, EstadoCarga, EstadoError, EstadoVacio } from '@/components/ui';
import { SiteNav } from '@/components/site-nav';
import { api, ApiError, type MiInstitucion } from '@/lib/api';

/**
 * Hub del BC Institucional. Se va a completar con enlaces reales a inventario, asignaciones,
 * docentes, reportes y dashboard a medida que esas unidades (D2-D7 del plan de frontend) se
 * implementen — por ahora solo confirma la membresía.
 */
export default function InstitucionPage() {
  const router = useRouter();
  const [mia, setMia] = useState<MiInstitucion | null>(null); // null = todavía no se sabe (cargando/error)
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  useEffect(() => {
    api
      .miInstitucion()
      .then((r) => {
        setMia(r);
        setEstado('ok');
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/institucion');
        else setEstado('error');
      });
  }, [router]);

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem' }}>
        <p className="eyebrow">Institución</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', margin: '0.3rem 0 1.2rem' }}>Tu institución</h1>

        {estado === 'cargando' ? <EstadoCarga>Cargando…</EstadoCarga> : null}
        {estado === 'error' ? <EstadoError titulo="No pudimos cargar tu institución" /> : null}

        {estado === 'ok' && mia?.institucion_id === null ? (
          <EstadoVacio
            icono="🏫"
            titulo="Todavía no estás vinculado a ninguna institución"
            accion={
              <Boton variante="primario" href="/institucion/registrar">
                Registrar mi institución
              </Boton>
            }
          >
            Si sos encargado de una institución educativa, registrala para empezar a comprar en
            lote y asignar licencias a tus docentes.
          </EstadoVacio>
        ) : null}

        {estado === 'ok' && mia?.institucion_id !== null ? (
          <div className="tarjeta">
            <p style={{ margin: '0 0 1rem' }}>
              {mia?.es_encargado
                ? 'Sos el encargado principal de tu institución.'
                : 'Formás parte de tu institución.'}
            </p>
            <Link className="boton boton--fantasma" href="/institucion/inventario">
              📦 Ver inventario institucional
            </Link>
            {mia?.es_encargado ? (
              <Link className="boton boton--fantasma" href="/institucion/carrito" style={{ marginLeft: '0.6rem' }}>
                🛒 Comprar en lote
              </Link>
            ) : null}
            {mia?.es_encargado ? (
              <Link className="boton boton--fantasma" href="/institucion/docentes" style={{ marginLeft: '0.6rem' }}>
                👩‍🏫 Ver docentes asignados
              </Link>
            ) : null}
            {mia?.es_encargado ? (
              <Link className="boton boton--fantasma" href="/institucion/reportes" style={{ marginLeft: '0.6rem' }}>
                📊 Reporte de uso
              </Link>
            ) : null}
            {mia?.es_encargado ? (
              <Link className="boton boton--fantasma" href="/institucion/dashboard" style={{ marginLeft: '0.6rem' }}>
                📈 Dashboard pedagógico
              </Link>
            ) : null}
          </div>
        ) : null}
      </main>
    </>
  );
}
