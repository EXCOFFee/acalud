'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alerta,
  Boton,
  Campo,
  Dato,
  Dialogo,
  EstadoCarga,
  EstadoError,
  EstadoVacio,
  Selector,
  Tabla,
  useToast,
  type ColumnaTabla,
} from '@/components/ui';
import { SiteNav } from '@/components/site-nav';
import { fechaCorta } from '@/lib/pedidos';
import {
  api,
  ApiError,
  type DetalleReporteDocente,
  type DetalleReporteJuego,
  type DocenteInstitucion,
  type FilaReporteDocente,
  type FilaReporteJuego,
  type FilaSerieTemporalReporte,
  type FiltroReporte,
  type ItemInventarioInstitucional,
  type PalabraFrecuente,
  type ReporteInstitucional,
  type SesionDelDocente,
  type SesionDelJuego,
} from '@/lib/api';

function BarraHorizontal({
  etiqueta,
  valor,
  maximo,
  sufijo = '',
  onClick,
}: {
  etiqueta: string;
  valor: number;
  maximo: number;
  sufijo?: string;
  onClick?: () => void;
}) {
  const porcentaje = maximo > 0 ? Math.max(4, Math.round((valor / maximo) * 100)) : 0;
  const barra = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
        <span>{etiqueta}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
          {valor}
          {sufijo}
        </span>
      </div>
      <div style={{ background: 'var(--superficie-2)', borderRadius: '999px', height: '0.6rem', overflow: 'hidden' }}>
        <div style={{ width: `${porcentaje}%`, height: '100%', background: 'var(--marca)', borderRadius: '999px' }} />
      </div>
    </>
  );
  return (
    <li style={{ listStyle: 'none' }}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          style={{
            all: 'unset',
            display: 'block',
            width: '100%',
            cursor: 'pointer',
            minHeight: '2.75rem',
          }}
          aria-label={`Ver detalle de ${etiqueta}`}
        >
          {barra}
        </button>
      ) : (
        barra
      )}
    </li>
  );
}

/** Línea de evolución temporal — SVG nativo, sin librería de gráficos (mismo criterio que el resto del proyecto). */
function GraficoEvolucion({ serie }: { serie: FilaSerieTemporalReporte[] }) {
  const alto = 100;
  const ancho = 480;
  const maximo = Math.max(1, ...serie.map((s) => s.sesiones));
  const pasoX = serie.length > 1 ? ancho / (serie.length - 1) : 0;
  const puntos = serie.map((s, i) => ({
    x: i * pasoX,
    y: alto - (s.sesiones / maximo) * (alto - 16),
  }));
  const polyline = puntos.map((p) => `${p.x},${p.y}`).join(' ');
  const descripcion = serie.map((s) => `${s.periodo}: ${s.sesiones} sesiones`).join(', ');

  return (
    <svg
      viewBox={`0 0 ${ancho} ${alto + 20}`}
      role="img"
      aria-label={`Evolución de sesiones por mes: ${descripcion}`}
      style={{ width: '100%', height: 'auto', maxWidth: `${ancho}px` }}
    >
      <polyline points={polyline} fill="none" stroke="var(--marca)" strokeWidth={2} />
      {puntos.map((p, i) => (
        <g key={serie[i]!.periodo}>
          <circle cx={p.x} cy={p.y} r={3} fill="var(--marca)" />
          <text x={p.x} y={alto + 14} fontSize={9} textAnchor="middle" fill="var(--tinta-suave)">
            {serie[i]!.periodo.slice(5)}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Nube de palabras — lista con tamaño de fuente proporcional a la frecuencia (texto, accesible por default). */
function NubeDePalabras({ palabras }: { palabras: PalabraFrecuente[] }) {
  const frecuenciaMax = Math.max(1, ...palabras.map((p) => p.frecuencia));
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'baseline' }}>
      {palabras.map((p) => {
        const tamanio = 0.8 + (p.frecuencia / frecuenciaMax) * 1.1; // 0.8rem–1.9rem
        return (
          <span
            key={p.palabra}
            style={{ fontSize: `${tamanio}rem`, color: 'var(--marca)', fontWeight: 600 }}
            title={`${p.frecuencia} mención${p.frecuencia === 1 ? '' : 'es'}`}
          >
            {p.palabra}
          </span>
        );
      })}
    </div>
  );
}

export default function ReporteInstitucionalPage() {
  const router = useRouter();
  const { notificar } = useToast();
  const [institucionId, setInstitucionId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroReporte>({ corte: 'juego' });
  const [reporte, setReporte] = useState<ReporteInstitucional | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'sin-permiso' | 'error'>('cargando');
  const [productos, setProductos] = useState<ItemInventarioInstitucional[]>([]);
  const [docentes, setDocentes] = useState<DocenteInstitucion[]>([]);
  const [exportando, setExportando] = useState(false);
  // CU-32 pasos 3-6: modal de exportación (formato + confirmación del rango).
  const [modalExportar, setModalExportar] = useState(false);
  const [formatoExport, setFormatoExport] = useState<'excel' | 'pdf'>('excel');
  const [errorExport, setErrorExport] = useState<string | null>(null);

  // CU-31 A8/A9: detalle de un juego o de un docente, en un modal.
  const [detalleJuego, setDetalleJuego] = useState<DetalleReporteJuego | 'cargando' | null>(null);
  const [detalleDocente, setDetalleDocente] = useState<DetalleReporteDocente | 'cargando' | null>(null);

  useEffect(() => {
    api
      .miInstitucion()
      .then((r) => {
        if (r.institucion_id === null) {
          router.replace('/institucion');
          return;
        }
        setInstitucionId(r.institucion_id);
        // Opciones de los filtros de producto/docente — mismos endpoints que D2/D3.
        api.verInventario(r.institucion_id).then((inv) => setProductos(inv.items)).catch(() => undefined);
        api
          .listarDocentesInstitucion(r.institucion_id)
          .then((d) => setDocentes(d.docentes))
          .catch(() => undefined);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/institucion/reportes');
        else setEstado('error');
      });
  }, [router]);

  useEffect(() => {
    if (!institucionId) return;
    let vivo = true;
    setEstado('cargando');
    api
      .verReporte(institucionId, filtro)
      .then((r) => {
        if (!vivo) return;
        setReporte(r);
        setEstado('ok');
      })
      .catch((err: unknown) => {
        if (!vivo) return;
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/institucion/reportes');
        else if (err instanceof ApiError && err.status === 404) setEstado('sin-permiso');
        else setEstado('error');
      });
    return () => {
      vivo = false;
    };
  }, [institucionId, filtro, router]);

  async function exportar(): Promise<void> {
    if (!institucionId) return;
    setErrorExport(null);
    setExportando(true);
    try {
      await api.exportarReporte(institucionId, filtro, formatoExport);
      notificar('¡Reporte exportado exitosamente!', 'ok');
      setModalExportar(false);
    } catch (err) {
      // CU-32 A1/A2/A3: el modal queda abierto para que el encargado ajuste filtros y reintente.
      if (err instanceof ApiError && err.status === 404) {
        setErrorExport('No hay datos para exportar con los filtros seleccionados. Ajustá los filtros e intentá nuevamente.');
      } else if (err instanceof ApiError && (err.status === 422 || err.status === 413)) {
        setErrorExport(err.problema.detail ?? 'El reporte es demasiado extenso. Acotá los filtros.');
      } else {
        setErrorExport('No pudimos exportar el reporte. Intentá nuevamente más tarde.');
      }
    } finally {
      setExportando(false);
    }
  }

  async function abrirDetalleJuego(productoId: string): Promise<void> {
    if (!institucionId) return;
    setDetalleJuego('cargando');
    try {
      const detalle = await api.verDetalleReporteJuego(institucionId, productoId, filtro);
      setDetalleJuego(detalle);
    } catch {
      notificar('No pudimos cargar el detalle del juego.', 'error');
      setDetalleJuego(null);
    }
  }

  async function abrirDetalleDocente(docenteId: string): Promise<void> {
    if (!institucionId) return;
    setDetalleDocente('cargando');
    try {
      const detalle = await api.verDetalleReporteDocente(institucionId, docenteId, filtro);
      setDetalleDocente(detalle);
    } catch {
      notificar('No pudimos cargar el detalle del docente.', 'error');
      setDetalleDocente(null);
    }
  }

  const hayFiltrosActivos = Boolean(filtro.desde || filtro.hasta || filtro.producto_id || filtro.docente_id);

  const columnasJuego: ColumnaTabla<FilaReporteJuego>[] = [
    {
      clave: 'producto',
      encabezado: 'Producto',
      render: (f) => (
        <button
          type="button"
          onClick={() => abrirDetalleJuego(f.producto_id)}
          style={{ all: 'unset', cursor: 'pointer', color: 'var(--marca)', fontWeight: 600, minHeight: '1.5rem' }}
        >
          {f.nombre_producto}
        </button>
      ),
    },
    { clave: 'sesiones', encabezado: 'Sesiones', alinear: 'derecha', render: (f) => f.total_sesiones },
    { clave: 'docentes', encabezado: 'Docentes distintos', alinear: 'derecha', render: (f) => f.docentes_distintos },
    { clave: 'alumnos', encabezado: 'Alumnos alcanzados', alinear: 'derecha', render: (f) => f.alumnos_alcanzados },
    { clave: 'minutos', encabezado: 'Minutos totales', alinear: 'derecha', render: (f) => f.minutos_totales },
    {
      clave: 'satisfaccion',
      encabezado: 'Satisfacción',
      alinear: 'derecha',
      render: (f) => `${f.satisfaccion_promedio} / 5`,
    },
    {
      clave: 'ultima',
      encabezado: 'Última sesión',
      render: (f) => (f.ultima_sesion ? fechaCorta(f.ultima_sesion) : '—'),
    },
  ];

  const columnasDocente: ColumnaTabla<FilaReporteDocente>[] = [
    {
      clave: 'docente',
      encabezado: 'Docente',
      render: (f) => (
        <button
          type="button"
          onClick={() => abrirDetalleDocente(f.docente_id)}
          style={{ all: 'unset', cursor: 'pointer', color: 'var(--marca)', fontWeight: 600, minHeight: '1.5rem' }}
        >
          {f.nombre_docente}
        </button>
      ),
    },
    { clave: 'sesiones', encabezado: 'Sesiones', alinear: 'derecha', render: (f) => f.total_sesiones },
    { clave: 'juegos', encabezado: 'Juegos distintos', alinear: 'derecha', render: (f) => f.juegos_distintos },
    { clave: 'alumnos', encabezado: 'Alumnos alcanzados', alinear: 'derecha', render: (f) => f.alumnos_alcanzados },
    { clave: 'minutos', encabezado: 'Minutos totales', alinear: 'derecha', render: (f) => f.minutos_totales },
    {
      clave: 'satisfaccion',
      encabezado: 'Satisfacción',
      alinear: 'derecha',
      render: (f) => `${f.satisfaccion_promedio} / 5`,
    },
  ];

  const columnasSesionesJuego: ColumnaTabla<SesionDelJuego>[] = [
    { clave: 'fecha', encabezado: 'Fecha', render: (s) => fechaCorta(s.fecha) },
    { clave: 'docente', encabezado: 'Docente', render: (s) => s.nombre_docente },
    { clave: 'grupo', encabezado: 'Grupo', render: (s) => s.grupo },
    { clave: 'estudiantes', encabezado: 'Estudiantes', alinear: 'derecha', render: (s) => s.estudiantes },
    { clave: 'duracion', encabezado: 'Duración (min)', alinear: 'derecha', render: (s) => s.duracion_minutos },
    { clave: 'satisfaccion', encabezado: 'Satisfacción', alinear: 'derecha', render: (s) => `${s.satisfaccion} / 5` },
  ];

  const columnasSesionesDocente: ColumnaTabla<SesionDelDocente>[] = [
    { clave: 'fecha', encabezado: 'Fecha', render: (s) => fechaCorta(s.fecha) },
    { clave: 'juego', encabezado: 'Juego', render: (s) => s.nombre_producto },
    { clave: 'grupo', encabezado: 'Grupo', render: (s) => s.grupo },
    { clave: 'estudiantes', encabezado: 'Estudiantes', alinear: 'derecha', render: (s) => s.estudiantes },
    { clave: 'duracion', encabezado: 'Duración (min)', alinear: 'derecha', render: (s) => s.duracion_minutos },
    { clave: 'satisfaccion', encabezado: 'Satisfacción', alinear: 'derecha', render: (s) => `${s.satisfaccion} / 5` },
  ];

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem' }}>
        <p className="eyebrow">Institución</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', margin: '0.3rem 0 1.2rem' }}>
          Reporte de uso institucional
        </h1>

        {estado === 'sin-permiso' ? (
          <Alerta tipo="aviso">
            No tenés permisos para ver los reportes institucionales. Contactá a tu encargado institucional.
          </Alerta>
        ) : null}

        {estado === 'error' ? (
          <EstadoError titulo="No pudimos cargar el reporte institucional">
            <Boton variante="primario" onClick={() => setFiltro((f) => ({ ...f }))}>
              Reintentar
            </Boton>
          </EstadoError>
        ) : null}

        {estado !== 'sin-permiso' && estado !== 'error' ? (
          <>
            <div className="filtros">
              <Selector
                id="corte"
                etiqueta="Ver por"
                value={filtro.corte}
                onChange={(e) => setFiltro((f) => ({ ...f, corte: e.target.value as FiltroReporte['corte'] }))}
              >
                <option value="juego">Juego</option>
                <option value="docente">Docente</option>
              </Selector>
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
                id="filtro-producto"
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
                id="filtro-docente"
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
              <Boton
                variante="fantasma"
                onClick={() => {
                  setErrorExport(null);
                  setModalExportar(true);
                }}
                disabled={estado !== 'ok'}
              >
                ⬇ Exportar reporte
              </Boton>
            </div>

            {estado === 'cargando' ? <EstadoCarga>Cargando reporte…</EstadoCarga> : null}

            {estado === 'ok' && reporte && reporte.datos.length === 0 && !hayFiltrosActivos ? (
              <EstadoVacio
                icono="📊"
                titulo="Aún no hay sesiones registradas para tu institución"
                accion={
                  <Boton variante="primario" href="/mis-juegos">
                    Ir a mis juegos asignados
                  </Boton>
                }
              >
                Los docentes deben comenzar a cargar sus sesiones de juego.
              </EstadoVacio>
            ) : null}

            {estado === 'ok' && reporte && reporte.datos.length === 0 && hayFiltrosActivos ? (
              <Alerta tipo="aviso">Ningún resultado con los filtros aplicados.</Alerta>
            ) : null}

            {estado === 'ok' && reporte && reporte.kpis.total_sesiones > 0 ? (
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
                      {reporte.kpis.total_sesiones}
                    </p>
                  </div>
                  <div className="tarjeta" style={{ padding: '1rem' }}>
                    <p style={{ margin: '0 0 0.2rem', fontSize: '0.78rem', color: 'var(--tinta-suave)' }}>
                      Alumnos alcanzados
                    </p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.6rem' }}>
                      {reporte.kpis.alumnos_alcanzados}
                    </p>
                  </div>
                  <div className="tarjeta" style={{ padding: '1rem' }}>
                    <p style={{ margin: '0 0 0.2rem', fontSize: '0.78rem', color: 'var(--tinta-suave)' }}>
                      Satisfacción promedio
                    </p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.6rem' }}>
                      {reporte.kpis.satisfaccion_promedio} <span aria-hidden="true">★</span>
                    </p>
                  </div>
                  <div className="tarjeta" style={{ padding: '1rem' }}>
                    <p style={{ margin: '0 0 0.2rem', fontSize: '0.78rem', color: 'var(--tinta-suave)' }}>
                      Juegos en uso
                    </p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.6rem' }}>
                      {reporte.kpis.juegos_en_uso}
                    </p>
                  </div>
                </div>

                {reporte.corte === 'juego' && reporte.datos.length > 0 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
                      gap: '1rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <div className="tarjeta" style={{ padding: '1.2rem' }}>
                      <h2 style={{ fontSize: '1rem', margin: '0 0 0.8rem' }}>Sesiones por juego</h2>
                      <p style={{ margin: '0 0 0.6rem', fontSize: '0.8rem', color: 'var(--tinta-suave)' }}>
                        Tocá un juego para ver el detalle.
                      </p>
                      <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {(reporte.datos as FilaReporteJuego[]).map((f) => (
                          <BarraHorizontal
                            key={f.producto_id}
                            etiqueta={f.nombre_producto}
                            valor={f.total_sesiones}
                            maximo={Math.max(1, ...(reporte.datos as FilaReporteJuego[]).map((d) => d.total_sesiones))}
                            onClick={() => abrirDetalleJuego(f.producto_id)}
                          />
                        ))}
                      </ul>
                    </div>
                    <div className="tarjeta" style={{ padding: '1.2rem' }}>
                      <h2 style={{ fontSize: '1rem', margin: '0 0 0.8rem' }}>Satisfacción promedio por juego</h2>
                      <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {(reporte.datos as FilaReporteJuego[]).map((f) => (
                          <BarraHorizontal
                            key={f.producto_id}
                            etiqueta={f.nombre_producto}
                            valor={f.satisfaccion_promedio}
                            maximo={5}
                            sufijo=" / 5"
                          />
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}

                {reporte.serie_temporal.length > 1 ? (
                  <div className="tarjeta" style={{ padding: '1.2rem', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1rem', margin: '0 0 0.8rem' }}>Evolución de sesiones por mes</h2>
                    <GraficoEvolucion serie={reporte.serie_temporal} />
                  </div>
                ) : null}

                {reporte.nube_palabras.length > 0 ? (
                  <div className="tarjeta" style={{ padding: '1.2rem', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1rem', margin: '0 0 0.8rem' }}>Aprendizajes clave más mencionados</h2>
                    <NubeDePalabras palabras={reporte.nube_palabras} />
                  </div>
                ) : null}
              </>
            ) : null}

            {estado === 'ok' && reporte && reporte.datos.length > 0 && reporte.corte === 'juego' ? (
              <Tabla
                columnas={columnasJuego}
                filas={reporte.datos as FilaReporteJuego[]}
                claveFila={(f) => f.producto_id}
              />
            ) : null}

            {estado === 'ok' && reporte && reporte.datos.length > 0 && reporte.corte === 'docente' ? (
              <Tabla
                columnas={columnasDocente}
                filas={reporte.datos as FilaReporteDocente[]}
                claveFila={(f) => f.docente_id}
              />
            ) : null}
          </>
        ) : null}
      </main>

      <Dialogo
        abierto={detalleJuego !== null}
        onCerrar={() => setDetalleJuego(null)}
        titulo={detalleJuego && detalleJuego !== 'cargando' ? detalleJuego.nombre_producto : 'Detalle del juego'}
        ancho="ancho"
      >
        {detalleJuego === 'cargando' ? <EstadoCarga>Cargando detalle…</EstadoCarga> : null}
        {detalleJuego && detalleJuego !== 'cargando' ? (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))',
                gap: '0.6rem',
                marginBottom: '1rem',
              }}
            >
              <Dato etiqueta="Sesiones">{detalleJuego.total_sesiones}</Dato>
              <Dato etiqueta="Alumnos alcanzados">{detalleJuego.alumnos_alcanzados}</Dato>
              <Dato etiqueta="Satisfacción promedio">{detalleJuego.satisfaccion_promedio} / 5</Dato>
            </div>

            <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.6rem' }}>Distribución de satisfacción</h3>
            <ul style={{ margin: '0 0 1.2rem', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {detalleJuego.distribucion_satisfaccion.map((d) => (
                <BarraHorizontal
                  key={d.estrellas}
                  etiqueta={`${d.estrellas} ★`}
                  valor={d.cantidad}
                  maximo={Math.max(1, ...detalleJuego.distribucion_satisfaccion.map((x) => x.cantidad))}
                />
              ))}
            </ul>

            {detalleJuego.nube_palabras.length > 0 ? (
              <>
                <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.6rem' }}>Aprendizajes clave</h3>
                <div style={{ marginBottom: '1.2rem' }}>
                  <NubeDePalabras palabras={detalleJuego.nube_palabras} />
                </div>
              </>
            ) : null}

            <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.6rem' }}>Sesiones registradas</h3>
            <Tabla
              columnas={columnasSesionesJuego}
              filas={detalleJuego.sesiones}
              claveFila={(s) => `${s.docente_id}-${s.fecha}-${s.grupo}`}
            />
          </>
        ) : null}
      </Dialogo>

      <Dialogo
        abierto={detalleDocente !== null}
        onCerrar={() => setDetalleDocente(null)}
        titulo={detalleDocente && detalleDocente !== 'cargando' ? detalleDocente.nombre_docente : 'Detalle del docente'}
        ancho="ancho"
      >
        {detalleDocente === 'cargando' ? <EstadoCarga>Cargando detalle…</EstadoCarga> : null}
        {detalleDocente && detalleDocente !== 'cargando' ? (
          <>
            <p style={{ margin: '0 0 1rem', color: 'var(--tinta-suave)' }}>{detalleDocente.email}</p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))',
                gap: '0.6rem',
                marginBottom: '1rem',
              }}
            >
              <Dato etiqueta="Sesiones">{detalleDocente.total_sesiones}</Dato>
              <Dato etiqueta="Alumnos alcanzados">{detalleDocente.alumnos_alcanzados}</Dato>
            </div>

            <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.6rem' }}>Juegos utilizados</h3>
            <ul style={{ margin: '0 0 1.2rem', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {detalleDocente.distribucion_juegos.map((j) => (
                <BarraHorizontal
                  key={j.producto_id}
                  etiqueta={j.nombre_producto}
                  valor={j.sesiones}
                  maximo={Math.max(1, ...detalleDocente.distribucion_juegos.map((x) => x.sesiones))}
                />
              ))}
            </ul>

            <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.6rem' }}>Sesiones registradas</h3>
            <Tabla
              columnas={columnasSesionesDocente}
              filas={detalleDocente.sesiones}
              claveFila={(s) => `${s.producto_id}-${s.fecha}-${s.grupo}`}
            />
          </>
        ) : null}
      </Dialogo>

      <Dialogo
        abierto={modalExportar}
        onCerrar={() => setModalExportar(false)}
        titulo="Exportar reporte"
        acciones={
          <>
            <Boton variante="fantasma" onClick={() => setModalExportar(false)} disabled={exportando}>
              Cancelar
            </Boton>
            <Boton variante="primario" onClick={exportar} cargando={exportando}>
              Exportar
            </Boton>
          </>
        }
      >
        {errorExport ? <Alerta tipo="error">{errorExport}</Alerta> : null}

        <div className="campo">
          <span className="campo__label" id="formato-export-label">
            Formato
          </span>
          <div role="group" aria-labelledby="formato-export-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label
              className="tarjeta"
              style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.7rem 1rem', cursor: 'pointer' }}
            >
              <input
                type="radio"
                name="formato_export"
                checked={formatoExport === 'excel'}
                onChange={() => setFormatoExport('excel')}
              />
              <span>
                <strong>Excel</strong>
                <br />
                <span style={{ fontSize: '0.85rem', color: 'var(--tinta-suave)' }}>
                  Tablas detalladas de sesiones, docentes y juegos
                </span>
              </span>
            </label>
            <label
              className="tarjeta"
              style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.7rem 1rem', cursor: 'pointer' }}
            >
              <input
                type="radio"
                name="formato_export"
                checked={formatoExport === 'pdf'}
                onChange={() => setFormatoExport('pdf')}
              />
              <span>
                <strong>PDF</strong>
                <br />
                <span style={{ fontSize: '0.85rem', color: 'var(--tinta-suave)' }}>
                  Presentación visual con gráficos y resumen
                </span>
              </span>
            </label>
          </div>
        </div>

        <p style={{ margin: '0.8rem 0 0', fontSize: '0.85rem', color: 'var(--tinta-suave)' }}>
          Período: {filtro.desde ?? 'sin definir'} a {filtro.hasta ?? 'hoy'}
        </p>
      </Dialogo>
    </>
  );
}
