'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alerta, Boton, Campo, EstadoCarga, EstadoError, EstadoVacio, Selector, useToast } from '@/components/ui';
import { SiteNav } from '@/components/site-nav';
import { BarraHorizontal, GraficoEvolucion, NubeDePalabras } from '@/components/graficos';
import { ModalExportar } from '@/components/modal-exportar';
import {
  api,
  ApiError,
  type DashboardPedagogico,
  type DocenteInstitucion,
  type FiltroDashboard,
  type ItemInventarioInstitucional,
  type KPIDashboard,
} from '@/lib/api';

const NOMBRE_DIA: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
  7: 'Dom',
};

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

export default function DashboardPedagogicoPage() {
  const router = useRouter();
  const { notificar } = useToast();
  const [institucionId, setInstitucionId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroDashboard>({});
  const [dashboard, setDashboard] = useState<DashboardPedagogico | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'sin-permiso' | 'error'>('cargando');
  const [productos, setProductos] = useState<ItemInventarioInstitucional[]>([]);
  const [docentes, setDocentes] = useState<DocenteInstitucion[]>([]);
  // CU-33 A9: modal de exportación (mismo componente compartido de CU-32).
  const [modalExportar, setModalExportar] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [errorExport, setErrorExport] = useState<string | null>(null);

  useEffect(() => {
    api
      .miInstitucion()
      .then((r) => {
        if (r.institucion_id === null) {
          router.replace('/institucion');
          return;
        }
        setInstitucionId(r.institucion_id);
        api.verInventario(r.institucion_id).then((inv) => setProductos(inv.items)).catch(() => undefined);
        api
          .listarDocentesInstitucion(r.institucion_id)
          .then((d) => setDocentes(d.docentes))
          .catch(() => undefined);
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

  async function exportar(formato: 'excel' | 'pdf'): Promise<void> {
    if (!institucionId) return;
    setErrorExport(null);
    setExportando(true);
    try {
      await api.exportarDashboard(institucionId, filtro, formato);
      notificar('¡Dashboard exportado exitosamente!', 'ok');
      setModalExportar(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 413) {
        setErrorExport(err.problema.detail ?? 'El archivo generado es demasiado grande. Acotá los filtros.');
      } else {
        setErrorExport('No pudimos exportar el dashboard. Intentá nuevamente más tarde.');
      }
    } finally {
      setExportando(false);
    }
  }

  // CU-33 A6: clic en una barra de juego/docente aplica (o saca, si ya estaba) ese filtro.
  function alternarFiltroProducto(productoId: string): void {
    setFiltro((f) => ({ ...f, producto_id: f.producto_id === productoId ? undefined : productoId }));
  }
  function alternarFiltroDocente(docenteId: string): void {
    setFiltro((f) => ({ ...f, docente_id: f.docente_id === docenteId ? undefined : docenteId }));
  }

  const sinDatos = dashboard ? Object.values(dashboard.kpis).every((k) => k.valor === 0) : false;
  const maxJuegos = dashboard ? Math.max(1, ...dashboard.top_juegos.map((j) => j.total_sesiones)) : 1;
  const maxDocentes = dashboard ? Math.max(1, ...dashboard.top_docentes.map((d) => d.total_sesiones)) : 1;
  const maxSemanal = dashboard ? Math.max(1, ...dashboard.serie_semanal.map((s) => s.sesiones)) : 1;
  const maxDiaSemana = dashboard ? Math.max(1, ...dashboard.distribucion_dia_semana.map((d) => d.sesiones)) : 1;
  const maxSatisfaccion = dashboard ? Math.max(1, ...dashboard.distribucion_satisfaccion.map((d) => d.cantidad)) : 1;

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
              <Selector
                id="filtro-producto-dashboard"
                etiqueta="Juego"
                value={filtro.producto_id ?? ''}
                onChange={(e) => setFiltro((f) => ({ ...f, producto_id: e.target.value || undefined }))}
              >
                <option value="">Todos los juegos</option>
                {productos.map((p) => (
                  <option key={p.producto_id} value={p.producto_id}>
                    {p.nombre_producto}
                  </option>
                ))}
              </Selector>
              <Selector
                id="filtro-docente-dashboard"
                etiqueta="Docente"
                value={filtro.docente_id ?? ''}
                onChange={(e) => setFiltro((f) => ({ ...f, docente_id: e.target.value || undefined }))}
              >
                <option value="">Todos los docentes</option>
                {docentes.map((d) => (
                  <option key={d.docente_id} value={d.docente_id}>
                    {d.nombre}
                  </option>
                ))}
              </Selector>
              {!filtro.desde && !filtro.hasta ? (
                <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--tinta-suave)' }}>
                  Mostrando los últimos 30 días
                </span>
              ) : null}
              <Boton
                variante="fantasma"
                onClick={() => {
                  setErrorExport(null);
                  setModalExportar(true);
                }}
                disabled={estado !== 'ok'}
              >
                ⬇ Exportar dashboard
              </Boton>
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
                  <div className="tarjeta" style={{ padding: '1rem' }}>
                    <p style={{ margin: '0 0 0.2rem', fontSize: '0.78rem', color: 'var(--tinta-suave)' }}>
                      Satisfacción promedio
                    </p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.6rem' }}>
                      {dashboard.kpis.satisfaccion_promedio.valor} <span aria-hidden="true">★</span>
                    </p>
                    <Variacion kpi={dashboard.kpis.satisfaccion_promedio} />
                  </div>
                  <div className="tarjeta" style={{ padding: '1rem' }}>
                    <p style={{ margin: '0 0 0.2rem', fontSize: '0.78rem', color: 'var(--tinta-suave)' }}>
                      Tasa de reutilización
                    </p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.6rem' }}>
                      {dashboard.kpis.tasa_reutilizacion.valor}%
                    </p>
                    <Variacion kpi={dashboard.kpis.tasa_reutilizacion} />
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
                    marginBottom: '1rem',
                  }}
                >
                  <div className="tarjeta" style={{ padding: '1.2rem' }}>
                    <h2 style={{ fontSize: '1rem', margin: '0 0 0.8rem' }}>Juegos más usados</h2>
                    {dashboard.top_juegos.length === 0 ? (
                      <p style={{ color: 'var(--tinta-suave)', fontSize: '0.9rem' }}>Sin datos en el período.</p>
                    ) : (
                      <>
                        <p style={{ margin: '0 0 0.6rem', fontSize: '0.8rem', color: 'var(--tinta-suave)' }}>
                          Tocá un juego para filtrar todo el dashboard por él.
                        </p>
                        <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          {dashboard.top_juegos.map((j) => (
                            <BarraHorizontal
                              key={j.producto_id}
                              etiqueta={j.nombre_producto}
                              valor={j.total_sesiones}
                              maximo={maxJuegos}
                              onClick={() => alternarFiltroProducto(j.producto_id)}
                            />
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                  <div className="tarjeta" style={{ padding: '1.2rem' }}>
                    <h2 style={{ fontSize: '1rem', margin: '0 0 0.8rem' }}>Docentes más activos</h2>
                    {dashboard.top_docentes.length === 0 ? (
                      <p style={{ color: 'var(--tinta-suave)', fontSize: '0.9rem' }}>Sin datos en el período.</p>
                    ) : (
                      <>
                        <p style={{ margin: '0 0 0.6rem', fontSize: '0.8rem', color: 'var(--tinta-suave)' }}>
                          Tocá un docente para filtrar todo el dashboard por él.
                        </p>
                        <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          {dashboard.top_docentes.map((d) => (
                            <BarraHorizontal
                              key={d.docente_id}
                              etiqueta={d.nombre_docente}
                              valor={d.total_sesiones}
                              maximo={maxDocentes}
                              onClick={() => alternarFiltroDocente(d.docente_id)}
                            />
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
                    gap: '1rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div className="tarjeta" style={{ padding: '1.2rem' }}>
                    <h2 style={{ fontSize: '1rem', margin: '0 0 0.8rem' }}>Distribución de satisfacción</h2>
                    <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {dashboard.distribucion_satisfaccion.map((d) => (
                        <BarraHorizontal
                          key={d.estrellas}
                          etiqueta={`${d.estrellas} ★`}
                          valor={d.cantidad}
                          maximo={maxSatisfaccion}
                        />
                      ))}
                    </ul>
                  </div>
                  <div className="tarjeta" style={{ padding: '1.2rem' }}>
                    <h2 style={{ fontSize: '1rem', margin: '0 0 0.8rem' }}>Sesiones por día de la semana</h2>
                    <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {dashboard.distribucion_dia_semana.map((d) => (
                        <BarraHorizontal
                          key={d.dia_semana}
                          etiqueta={NOMBRE_DIA[d.dia_semana]!}
                          valor={d.sesiones}
                          maximo={maxDiaSemana}
                        />
                      ))}
                    </ul>
                  </div>
                </div>

                {dashboard.serie_mensual.length > 1 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))',
                      gap: '1rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <div className="tarjeta" style={{ padding: '1.2rem' }}>
                      <h2 style={{ fontSize: '1rem', margin: '0 0 0.8rem' }}>Evolución de sesiones por mes</h2>
                      <GraficoEvolucion
                        puntos={dashboard.serie_mensual.map((s) => ({ etiqueta: s.periodo, valor: s.sesiones }))}
                        descripcion={`Evolución de sesiones por mes: ${dashboard.serie_mensual
                          .map((s) => `${s.periodo}: ${s.sesiones} sesiones`)
                          .join(', ')}`}
                      />
                    </div>
                    <div className="tarjeta" style={{ padding: '1.2rem' }}>
                      <h2 style={{ fontSize: '1rem', margin: '0 0 0.8rem' }}>Evolución de satisfacción por mes</h2>
                      <GraficoEvolucion
                        puntos={dashboard.serie_mensual.map((s) => ({
                          etiqueta: s.periodo,
                          valor: s.satisfaccion_promedio,
                        }))}
                        maximoFijo={5}
                        descripcion={`Evolución de satisfacción por mes: ${dashboard.serie_mensual
                          .map((s) => `${s.periodo}: ${s.satisfaccion_promedio} de 5`)
                          .join(', ')}`}
                      />
                    </div>
                  </div>
                ) : null}

                {dashboard.nube_palabras.length > 0 || dashboard.dificultades_frecuentes.length > 0 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
                      gap: '1rem',
                    }}
                  >
                    {dashboard.nube_palabras.length > 0 ? (
                      <div className="tarjeta" style={{ padding: '1.2rem' }}>
                        <h2 style={{ fontSize: '1rem', margin: '0 0 0.8rem' }}>Aprendizajes clave más mencionados</h2>
                        <NubeDePalabras palabras={dashboard.nube_palabras} />
                      </div>
                    ) : null}
                    {dashboard.dificultades_frecuentes.length > 0 ? (
                      <div className="tarjeta" style={{ padding: '1.2rem' }}>
                        <h2 style={{ fontSize: '1rem', margin: '0 0 0.8rem' }}>Dificultades más frecuentes</h2>
                        <NubeDePalabras palabras={dashboard.dificultades_frecuentes} />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
      </main>

      <ModalExportar
        abierto={modalExportar}
        onCerrar={() => setModalExportar(false)}
        onExportar={exportar}
        cargando={exportando}
        error={errorExport}
        titulo="Exportar dashboard"
        descripcionExcel="Resumen de KPIs, juegos, docentes, aprendizajes y dificultades"
        descripcionPdf="Presentación visual con todos los gráficos del dashboard"
        periodoTexto={`Período: ${filtro.desde ?? 'sin definir'} a ${filtro.hasta ?? 'hoy'}`}
      />
    </>
  );
}
