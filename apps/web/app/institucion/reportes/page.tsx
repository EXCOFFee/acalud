'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alerta,
  Boton,
  Campo,
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
  type DocenteInstitucion,
  type FilaReporteDocente,
  type FilaReporteJuego,
  type FiltroReporte,
  type ItemInventarioInstitucional,
  type ReporteInstitucional,
} from '@/lib/api';

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

  async function exportarCSV(): Promise<void> {
    if (!institucionId) return;
    setExportando(true);
    try {
      await api.exportarReporte(institucionId, filtro);
      notificar('Reporte exportado exitosamente.', 'ok');
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        notificar(err.problema.detail ?? 'El reporte es demasiado extenso. Acotá los filtros.', 'error');
      } else {
        notificar('No pudimos exportar el reporte. Intentá nuevamente más tarde.', 'error');
      }
    } finally {
      setExportando(false);
    }
  }

  const hayFiltrosActivos = Boolean(filtro.desde || filtro.hasta || filtro.producto_id || filtro.docente_id);

  const columnasJuego: ColumnaTabla<FilaReporteJuego>[] = [
    { clave: 'producto', encabezado: 'Producto', render: (f) => f.nombre_producto },
    { clave: 'sesiones', encabezado: 'Sesiones', alinear: 'derecha', render: (f) => f.total_sesiones },
    { clave: 'docentes', encabezado: 'Docentes distintos', alinear: 'derecha', render: (f) => f.docentes_distintos },
    { clave: 'alumnos', encabezado: 'Alumnos alcanzados', alinear: 'derecha', render: (f) => f.alumnos_alcanzados },
    { clave: 'minutos', encabezado: 'Minutos totales', alinear: 'derecha', render: (f) => f.minutos_totales },
    {
      clave: 'ultima',
      encabezado: 'Última sesión',
      render: (f) => (f.ultima_sesion ? fechaCorta(f.ultima_sesion) : '—'),
    },
  ];

  const columnasDocente: ColumnaTabla<FilaReporteDocente>[] = [
    { clave: 'docente', encabezado: 'Docente', render: (f) => f.nombre_docente },
    { clave: 'sesiones', encabezado: 'Sesiones', alinear: 'derecha', render: (f) => f.total_sesiones },
    { clave: 'juegos', encabezado: 'Juegos distintos', alinear: 'derecha', render: (f) => f.juegos_distintos },
    { clave: 'alumnos', encabezado: 'Alumnos alcanzados', alinear: 'derecha', render: (f) => f.alumnos_alcanzados },
    { clave: 'minutos', encabezado: 'Minutos totales', alinear: 'derecha', render: (f) => f.minutos_totales },
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
              <Boton variante="fantasma" onClick={exportarCSV} cargando={exportando} disabled={estado !== 'ok'}>
                ⬇ Exportar CSV
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
    </>
  );
}
