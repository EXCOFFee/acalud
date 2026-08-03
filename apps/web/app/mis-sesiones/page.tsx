'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alerta,
  Boton,
  Dialogo,
  EstadoCarga,
  EstadoError,
  EstadoVacio,
  Paginacion,
  Selector,
  Tabla,
  type ColumnaTabla,
} from '@/components/ui';
import { SiteNav } from '@/components/site-nav';
import { fechaCorta, fechaHoraCorta } from '@/lib/pedidos';
import {
  api,
  ApiError,
  type MiJuegoAsignado,
  type ResultadoPaginadoSesiones,
  type SesionDetalle,
  type SesionResumen,
} from '@/lib/api';

const TAMANIO_PAGINA = 20;

function estrellas(n: number): string {
  return `${'★'.repeat(n)}${'☆'.repeat(5 - n)} (${n}/5)`;
}

export default function MisSesionesPage() {
  const router = useRouter();
  const [productoId, setProductoId] = useState<string | undefined>(undefined);
  const [pagina, setPagina] = useState(1);
  const [juegos, setJuegos] = useState<MiJuegoAsignado[] | null>(null);
  const [resultado, setResultado] = useState<ResultadoPaginadoSesiones | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'sin-vinculo' | 'error'>('cargando');

  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<SesionDetalle | null>(null);
  const [detalleEstado, setDetalleEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  // Deep-link ?producto_id=… (mismo patrón que /catalogo/juego y /editoriales).
  useEffect(() => {
    const inicial = new URLSearchParams(window.location.search).get('producto_id');
    if (inicial) setProductoId(inicial);
    api
      .misJuegosAsignados()
      .then((r) => setJuegos(r.juegos))
      .catch(() => undefined);
  }, []);

  function cargar(): void {
    setEstado('cargando');
    api
      .misSesiones({ producto_id: productoId, pagina, limite: TAMANIO_PAGINA })
      .then((r) => {
        setResultado(r);
        setEstado('ok');
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/mis-sesiones');
        else if (err instanceof ApiError && err.status === 422) setEstado('sin-vinculo');
        else setEstado('error');
      });
  }

  useEffect(cargar, [productoId, pagina, router]);

  async function abrirDetalle(id: string): Promise<void> {
    setDetalleId(id);
    setDetalle(null);
    setDetalleEstado('cargando');
    try {
      const d = await api.verDetalleSesion(id);
      setDetalle(d);
      setDetalleEstado('ok');
    } catch {
      setDetalleEstado('error');
    }
  }

  const columnas: ColumnaTabla<SesionResumen>[] = [
    { clave: 'fecha', encabezado: 'Fecha', render: (s) => fechaCorta(s.fecha) },
    { clave: 'juego', encabezado: 'Juego', render: (s) => s.nombreProducto },
    { clave: 'grupo', encabezado: 'Grupo', render: (s) => s.grupo },
    { clave: 'estudiantes', encabezado: 'Estudiantes', alinear: 'derecha', render: (s) => s.estudiantes },
    { clave: 'duracion', encabezado: 'Duración', alinear: 'derecha', render: (s) => `${s.duracionMinutos} min` },
    { clave: 'satisfaccion', encabezado: 'Satisfacción', render: (s) => estrellas(s.satisfaccion) },
    {
      clave: 'accion',
      encabezado: '',
      render: (s) => (
        <Boton variante="fantasma" onClick={() => abrirDetalle(s.id)}>
          Ver detalle
        </Boton>
      ),
    },
  ];

  // RN-005: sin endpoint de agregación propio (a diferencia de CU-28), así que los promedios se
  // calculan sobre la página visible — el total de sesiones sí es exacto (viene de totalItems).
  const items = resultado?.items ?? [];
  const esParcial = (resultado?.totalPaginas ?? 1) > 1;
  const promedioSatisfaccion =
    items.length > 0 ? items.reduce((acc, s) => acc + s.satisfaccion, 0) / items.length : 0;
  const totalEstudiantes = items.reduce((acc, s) => acc + s.estudiantes, 0);

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem' }}>
        <p className="eyebrow">Mis sesiones</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', margin: '0.3rem 0 1.2rem' }}>
          Historial de sesiones cargadas
        </h1>

        {estado === 'cargando' ? <EstadoCarga>Cargando tu historial…</EstadoCarga> : null}

        {estado === 'sin-vinculo' ? (
          <Alerta tipo="aviso">
            Para registrar y ver sesiones, primero un encargado institucional tiene que vincularte
            a su institución.
          </Alerta>
        ) : null}

        {estado === 'error' ? (
          <EstadoError titulo="No pudimos cargar tu historial de sesiones">
            <Boton variante="primario" onClick={cargar}>
              Reintentar
            </Boton>
          </EstadoError>
        ) : null}

        {estado === 'ok' && resultado && resultado.totalItems === 0 && !productoId ? (
          <EstadoVacio
            icono="📝"
            titulo="Aún no has registrado sesiones de juego"
            accion={
              <Boton variante="primario" href="/mis-juegos">
                Ir a mis juegos asignados
              </Boton>
            }
          >
            Comenzá a cargar tus primeras sesiones desde ahí.
          </EstadoVacio>
        ) : null}

        {estado === 'ok' && resultado && (resultado.totalItems > 0 || productoId) ? (
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
                <p style={{ margin: '0 0 0.2rem', fontSize: '0.78rem', color: 'var(--tinta-suave)' }}>
                  Total de sesiones
                </p>
                <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.6rem' }}>
                  {resultado.totalItems}
                </p>
              </div>
              <div className="tarjeta" style={{ padding: '1rem' }}>
                <p style={{ margin: '0 0 0.2rem', fontSize: '0.78rem', color: 'var(--tinta-suave)' }}>
                  Estudiantes alcanzados{esParcial ? ' (esta página)' : ''}
                </p>
                <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.6rem' }}>
                  {totalEstudiantes}
                </p>
              </div>
              <div className="tarjeta" style={{ padding: '1rem' }}>
                <p style={{ margin: '0 0 0.2rem', fontSize: '0.78rem', color: 'var(--tinta-suave)' }}>
                  Satisfacción promedio{esParcial ? ' (esta página)' : ''}
                </p>
                <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.6rem' }}>
                  {items.length > 0 ? promedioSatisfaccion.toFixed(1) : '—'}
                </p>
              </div>
            </div>

            <div className="filtros">
              <Selector
                id="filtro-juego"
                etiqueta="Juego"
                value={productoId ?? ''}
                onChange={(e) => {
                  setPagina(1);
                  setProductoId(e.target.value || undefined);
                }}
              >
                <option value="">Todos los juegos</option>
                {(juegos ?? []).map((j) => (
                  <option key={j.producto_id} value={j.producto_id}>
                    {j.nombre_producto}
                  </option>
                ))}
              </Selector>
            </div>

            {resultado.totalItems === 0 ? (
              <Alerta tipo="aviso">Ningún resultado con ese filtro.</Alerta>
            ) : (
              <>
                <Tabla columnas={columnas} filas={items} claveFila={(s) => s.id} />
                <Paginacion
                  pagina={resultado.paginaActual}
                  tamanio={TAMANIO_PAGINA}
                  total={resultado.totalItems}
                  onCambiar={setPagina}
                />
              </>
            )}
          </>
        ) : null}
      </main>

      <Dialogo abierto={detalleId !== null} onCerrar={() => setDetalleId(null)} titulo="Detalle de la sesión">
        {detalleEstado === 'cargando' ? <EstadoCarga>Cargando…</EstadoCarga> : null}
        {detalleEstado === 'error' ? <EstadoError titulo="No pudimos cargar el detalle" /> : null}
        {detalleEstado === 'ok' && detalle ? (
          <div>
            <div className="dato">
              <span className="dato__k">Juego</span>
              <span className="dato__v">{detalle.nombreProducto}</span>
            </div>
            <div className="dato">
              <span className="dato__k">Fecha de uso</span>
              <span className="dato__v">{fechaCorta(detalle.fecha)}</span>
            </div>
            <div className="dato">
              <span className="dato__k">Grupo / curso</span>
              <span className="dato__v">{detalle.grupo}</span>
            </div>
            <div className="dato">
              <span className="dato__k">Estudiantes</span>
              <span className="dato__v">{detalle.estudiantes}</span>
            </div>
            <div className="dato">
              <span className="dato__k">Duración</span>
              <span className="dato__v">{detalle.duracionMinutos} minutos</span>
            </div>
            <div className="dato">
              <span className="dato__k">Satisfacción</span>
              <span className="dato__v">{estrellas(detalle.satisfaccion)}</span>
            </div>
            <div className="dato">
              <span className="dato__k">¿Reutilizaría el juego?</span>
              <span className="dato__v">{detalle.reutilizaria ? 'Sí' : 'No'}</span>
            </div>
            <div className="dato">
              <span className="dato__k">Registrada el</span>
              <span className="dato__v">{fechaHoraCorta(detalle.registradaEn)}</span>
            </div>

            <h3 style={{ fontSize: '1rem', margin: '1.1rem 0 0.4rem' }}>Aprendizajes clave</h3>
            <p style={{ margin: 0 }}>{detalle.aprendizajes}</p>

            {detalle.dificultades ? (
              <>
                <h3 style={{ fontSize: '1rem', margin: '1.1rem 0 0.4rem' }}>Dificultades encontradas</h3>
                <p style={{ margin: 0 }}>{detalle.dificultades}</p>
              </>
            ) : null}
          </div>
        ) : null}
      </Dialogo>
    </>
  );
}
