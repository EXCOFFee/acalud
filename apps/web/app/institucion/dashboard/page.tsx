'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alerta, Boton, Campo, EstadoCarga, EstadoError, EstadoVacio } from '@/components/ui';
import { SiteNav } from '@/components/site-nav';
import { api, ApiError, type DashboardPedagogico, type FiltroDashboard, type KPIDashboard } from '@/lib/api';

function Variacion({ kpi }: { kpi: KPIDashboard }) {
  if (kpi.variacion_porcentual === null) {
    return <span style={{ fontSize: '0.8rem', color: 'var(--tinta-suave)' }}>Sin datos del período anterior</span>;
  }
  const positiva = kpi.variacion_porcentual >= 0;
  return (
    <span style={{ fontSize: '0.8rem', color: positiva ? 'var(--ok)' : 'var(--error)', fontWeight: 600 }}>
      <span aria-hidden="true">{positiva ? '▲' : '▼'}</span> {Math.abs(kpi.variacion_porcentual)}% vs período anterior
    </span>
  );
}

function BarraHorizontal({ etiqueta, valor, maximo }: { etiqueta: string; valor: number; maximo: number }) {
  const porcentaje = maximo > 0 ? Math.max(4, Math.round((valor / maximo) * 100)) : 0;
  return (
    <li style={{ listStyle: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
        <span>{etiqueta}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{valor}</span>
      </div>
      <div style={{ background: 'var(--superficie-2)', borderRadius: '999px', height: '0.6rem', overflow: 'hidden' }}>
        <div style={{ width: `${porcentaje}%`, height: '100%', background: 'var(--marca)', borderRadius: '999px' }} />
      </div>
    </li>
  );
}

export default function DashboardPedagogicoPage() {
  const router = useRouter();
  const [institucionId, setInstitucionId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroDashboard>({});
  const [dashboard, setDashboard] = useState<DashboardPedagogico | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'sin-permiso' | 'error'>('cargando');

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
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/institucion/dashboard');
        else setEstado('error');
      });
  }, [router]);

  useEffect(() => {
    if (!institucionId) return;
    let vivo = true;
    setEstado('cargando');
    api
      .verDashboard(institucionId, filtro)
      .then((r) => {
        if (!vivo) return;
        setDashboard(r);
        setEstado('ok');
      })
      .catch((err: unknown) => {
        if (!vivo) return;
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/institucion/dashboard');
        else if (err instanceof ApiError && err.status === 404) setEstado('sin-permiso');
        else setEstado('error');
      });
    return () => {
      vivo = false;
    };
  }, [institucionId, filtro, router]);

  const sinDatos = dashboard ? Object.values(dashboard.kpis).every((k) => k.valor === 0) : false;
  const maxJuegos = dashboard ? Math.max(1, ...dashboard.top_juegos.map((j) => j.sesiones)) : 1;
  const maxDocentes = dashboard ? Math.max(1, ...dashboard.top_docentes.map((d) => d.sesiones)) : 1;
  const maxSemanal = dashboard ? Math.max(1, ...dashboard.serie_semanal.map((s) => s.sesiones)) : 1;

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem' }}>
        <p className="eyebrow">Institución</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', margin: '0.3rem 0 1.2rem' }}>Dashboard pedagógico</h1>

        {estado === 'sin-permiso' ? (
          <Alerta tipo="aviso">
            No tenés permisos para ver el dashboard pedagógico. Contactá a tu encargado institucional.
          </Alerta>
        ) : null}

        {estado === 'error' ? (
          <EstadoError titulo="No pudimos cargar el dashboard pedagógico">
            <Boton variante="primario" onClick={() => setFiltro((f) => ({ ...f }))}>
              Reintentar
            </Boton>
          </EstadoError>
        ) : null}

        {estado !== 'sin-permiso' && estado !== 'error' ? (
          <>
            <div className="filtros">
              <Campo
                id="desde"
                etiqueta="Desde"
                type="date"
                value={filtro.desde ?? ''}
                onChange={(e) => setFiltro((f) => ({ ...f, desde: e.target.value || undefined }))}
              />
              <Campo
                id="hasta"
                etiqueta="Hasta"
                type="date"
                value={filtro.hasta ?? ''}
                onChange={(e) => setFiltro((f) => ({ ...f, hasta: e.target.value || undefined }))}
              />
              {!filtro.desde && !filtro.hasta ? (
                <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--tinta-suave)' }}>
                  Mostrando los últimos 30 días
                </span>
              ) : null}
            </div>

            {estado === 'cargando' ? <EstadoCarga>Cargando dashboard…</EstadoCarga> : null}

            {estado === 'ok' && dashboard && sinDatos ? (
              <EstadoVacio
                icono="📈"
                titulo="Aún no hay datos pedagógicos disponibles"
                accion={
                  <Boton variante="primario" href="/mis-juegos">
                    Ir a mis juegos asignados
                  </Boton>
                }
              >
                Los docentes deben comenzar a registrar sesiones de juego para generar datos.
              </EstadoVacio>
            ) : null}

            {estado === 'ok' && dashboard && !sinDatos ? (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))',
                    gap: '0.8rem',
                    margin: '1rem 0 1.4rem',
                  }}
                >
                  <div className="tarjeta" style={{ padding: '1rem' }}>
                    <p style={{ margin: '0 0 0.2rem', fontSize: '0.78rem', color: 'var(--tinta-suave)' }}>Sesiones</p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.6rem' }}>
                      {dashboard.kpis.sesiones.valor}
                    </p>
                    <Variacion kpi={dashboard.kpis.sesiones} />
                  </div>
                  <div className="tarjeta" style={{ padding: '1rem' }}>
                    <p style={{ margin: '0 0 0.2rem', fontSize: '0.78rem', color: 'var(--tinta-suave)' }}>
                      Docentes activos
                    </p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.6rem' }}>
                      {dashboard.kpis.docentes_activos.valor}
                    </p>
                    <Variacion kpi={dashboard.kpis.docentes_activos} />
                  </div>
                  <div className="tarjeta" style={{ padding: '1rem' }}>
                    <p style={{ margin: '0 0 0.2rem', fontSize: '0.78rem', color: 'var(--tinta-suave)' }}>
                      Alumnos alcanzados
                    </p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.6rem' }}>
                      {dashboard.kpis.alumnos_alcanzados.valor}
                    </p>
                    <Variacion kpi={dashboard.kpis.alumnos_alcanzados} />
                  </div>
                  <div className="tarjeta" style={{ padding: '1rem' }}>
                    <p style={{ margin: '0 0 0.2rem', fontSize: '0.78rem', color: 'var(--tinta-suave)' }}>
                      Minutos de juego
                    </p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.6rem' }}>
                      {dashboard.kpis.minutos_de_juego.valor}
                    </p>
                    <Variacion kpi={dashboard.kpis.minutos_de_juego} />
                  </div>
                </div>

                {dashboard.serie_semanal.length > 0 ? (
                  <div className="tarjeta" style={{ padding: '1.2rem', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1rem', margin: '0 0 0.8rem' }}>Sesiones por semana</h2>
                    <div
                      style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '8rem' }}
                      role="img"
                      aria-label={`Sesiones por semana: ${dashboard.serie_semanal
                        .map((s) => `${s.semana}: ${s.sesiones}`)
                        .join(', ')}`}
                    >
                      {dashboard.serie_semanal.map((s) => (
                        <div
                          key={s.semana}
                          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', height: '100%', justifyContent: 'flex-end' }}
                        >
                          <span style={{ fontSize: '0.72rem', fontVariantNumeric: 'tabular-nums' }}>{s.sesiones}</span>
                          <div
                            style={{
                              width: '100%',
                              maxWidth: '2.2rem',
                              height: `${Math.max(4, Math.round((s.sesiones / maxSemanal) * 100))}%`,
                              background: 'var(--marca)',
                              borderRadius: '0.3rem 0.3rem 0 0',
                            }}
                          />
                          <span style={{ fontSize: '0.68rem', color: 'var(--tinta-suave)' }}>
                            {s.semana.replace(/^\d{4}-/, '')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
                    gap: '1rem',
                  }}
                >
                  <div className="tarjeta" style={{ padding: '1.2rem' }}>
                    <h2 style={{ fontSize: '1rem', margin: '0 0 0.8rem' }}>Juegos más usados</h2>
                    {dashboard.top_juegos.length === 0 ? (
                      <p style={{ color: 'var(--tinta-suave)', fontSize: '0.9rem' }}>Sin datos en el período.</p>
                    ) : (
                      <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {dashboard.top_juegos.map((j) => (
                          <BarraHorizontal key={j.producto_id} etiqueta={j.nombre} valor={j.sesiones} maximo={maxJuegos} />
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="tarjeta" style={{ padding: '1.2rem' }}>
                    <h2 style={{ fontSize: '1rem', margin: '0 0 0.8rem' }}>Docentes más activos</h2>
                    {dashboard.top_docentes.length === 0 ? (
                      <p style={{ color: 'var(--tinta-suave)', fontSize: '0.9rem' }}>Sin datos en el período.</p>
                    ) : (
                      <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {dashboard.top_docentes.map((d) => (
                          <BarraHorizontal key={d.docente_id} etiqueta={d.nombre} valor={d.sesiones} maximo={maxDocentes} />
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </main>
    </>
  );
}
