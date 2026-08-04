'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alerta,
  Boton,
  Campo,
  Dialogo,
  EstadoCarga,
  EstadoError,
  EstadoVacio,
  Insignia,
  Selector,
  Tabla,
  useToast,
  type ColumnaTabla,
} from '@/components/ui';
import { fechaCorta } from '@/lib/pedidos';
import { SiteNav } from '@/components/site-nav';
import {
  api,
  ApiError,
  type EstadoPropuestaAdmin,
  type FiltroPropuestasAdmin,
  type PropuestaAdminDetalle,
  type PropuestaAdminResumen,
} from '@/lib/api';

const ESTADO: Record<EstadoPropuestaAdmin, { etiqueta: string; variante: 'default' | 'ok' | 'off' | 'neutra' }> = {
  pending: { etiqueta: 'Pendiente', variante: 'default' },
  reviewed: { etiqueta: 'En revisión', variante: 'neutra' },
  approved: { etiqueta: 'Aprobada', variante: 'ok' },
  rejected: { etiqueta: 'Rechazada', variante: 'off' },
};

const MAX_FEEDBACK = 2000;

export default function AdminPropuestasPage() {
  const router = useRouter();
  const { notificar } = useToast();
  const [esAdmin, setEsAdmin] = useState<boolean | null>(null);

  const [filtro, setFiltro] = useState<FiltroPropuestasAdmin>({ order: 'desc' });
  const [buscarTexto, setBuscarTexto] = useState('');
  const [propuestas, setPropuestas] = useState<PropuestaAdminResumen[] | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  const [propuestaId, setPropuestaId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<PropuestaAdminDetalle | null>(null);
  const [detalleEstado, setDetalleEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [estadoElegido, setEstadoElegido] = useState<EstadoPropuestaAdmin>('pending');
  const [feedback, setFeedback] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function cargar(): void {
    setEstado('cargando');
    api
      .listarPropuestasAdmin(filtro)
      .then((r) => {
        setPropuestas(r);
        setEstado('ok');
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/admin/propuestas');
        else setEstado('error');
      });
  }

  useEffect(() => {
    api
      .me()
      .then((p) => {
        setEsAdmin(p.es_admin);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/admin/propuestas');
        else setEsAdmin(false);
      });
  }, [router]);

  useEffect(() => {
    if (esAdmin) cargar();
  }, [esAdmin, filtro]);

  async function abrirRevisar(id: string): Promise<void> {
    setPropuestaId(id);
    setDetalle(null);
    setFormError(null);
    setDetalleEstado('cargando');
    try {
      const d = await api.verPropuestaAdmin(id);
      setDetalle(d);
      setEstadoElegido(d.estado);
      setFeedback(d.feedback_admin ?? '');
      setDetalleEstado('ok');
    } catch {
      setDetalleEstado('error');
    }
  }

  async function guardarRevision(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!propuestaId) return;
    setFormError(null);
    setGuardando(true);
    try {
      await api.revisarPropuestaAdmin(propuestaId, {
        estado: estadoElegido,
        feedback: feedback.trim() || null,
      });
      notificar('Revisión guardada. Se notificó al docente.', 'ok');
      setPropuestaId(null);
      cargar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?volver=/admin/propuestas');
        return;
      }
      if (err instanceof ApiError && (err.status === 409 || err.status === 404)) {
        setFormError(err.problema.detail ?? 'No pudimos guardar la revisión.');
      } else {
        setFormError('No pudimos conectar. Revisá tu conexión.');
      }
    } finally {
      setGuardando(false);
    }
  }

  const opcionesEstado: EstadoPropuestaAdmin[] =
    detalle && (detalle.estado === 'approved' || detalle.estado === 'rejected')
      ? ['reviewed', 'approved', 'rejected']
      : ['pending', 'reviewed', 'approved', 'rejected'];

  const columnas: ColumnaTabla<PropuestaAdminResumen>[] = [
    { clave: 'titulo', encabezado: 'Título', render: (p) => p.titulo },
    { clave: 'autor', encabezado: 'Autor', render: (p) => p.autor },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (p) => <Insignia variante={ESTADO[p.estado].variante}>{ESTADO[p.estado].etiqueta}</Insignia>,
    },
    { clave: 'creada', encabezado: 'Enviada', render: (p) => fechaCorta(p.creada_en) },
    {
      clave: 'accion',
      encabezado: '',
      render: (p) => (
        <Boton variante="fantasma" onClick={() => abrirRevisar(p.id)}>
          Revisar
        </Boton>
      ),
    },
  ];

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem' }}>
        <p className="eyebrow">Administración</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', margin: '0.3rem 0 1.2rem' }}>
          Propuestas de juegos
        </h1>

        {esAdmin === false ? (
          <Alerta tipo="aviso">No tenés permisos de administrador para acceder a esta sección.</Alerta>
        ) : null}

        {esAdmin ? (
          <>
            <div className="filtros">
              <Selector
                id="filtro-estado-propuesta"
                etiqueta="Estado"
                value={filtro.status ?? ''}
                onChange={(e) => setFiltro((f) => ({ ...f, status: (e.target.value || undefined) as EstadoPropuestaAdmin | undefined }))}
              >
                <option value="">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="reviewed">En revisión</option>
                <option value="approved">Aprobada</option>
                <option value="rejected">Rechazada</option>
              </Selector>
              <form
                role="search"
                style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}
                onSubmit={(e) => {
                  e.preventDefault();
                  setFiltro((f) => ({ ...f, search: buscarTexto.trim() || undefined }));
                }}
              >
                <Campo
                  id="buscar-propuesta"
                  etiqueta="Buscar"
                  type="search"
                  value={buscarTexto}
                  onChange={(e) => setBuscarTexto(e.target.value)}
                  placeholder="Título…"
                />
                <Boton variante="fantasma" type="submit">
                  Buscar
                </Boton>
              </form>
              <Boton variante="fantasma" onClick={() => setFiltro((f) => ({ ...f, order: f.order === 'asc' ? 'desc' : 'asc' }))}>
                {filtro.order === 'asc' ? '↑ Más antiguas primero' : '↓ Más recientes primero'}
              </Boton>
            </div>

            {estado === 'cargando' ? <EstadoCarga>Cargando propuestas…</EstadoCarga> : null}
            {estado === 'error' ? (
              <EstadoError titulo="No pudimos cargar las propuestas">
                <Boton variante="primario" onClick={cargar}>
                  Reintentar
                </Boton>
              </EstadoError>
            ) : null}

            {estado === 'ok' && propuestas && propuestas.length === 0 ? (
              <EstadoVacio icono="💡" titulo="No hay propuestas para mostrar">
                Probá cambiar los filtros.
              </EstadoVacio>
            ) : null}

            {estado === 'ok' && propuestas && propuestas.length > 0 ? (
              <Tabla columnas={columnas} filas={propuestas} claveFila={(p) => p.id} />
            ) : null}
          </>
        ) : null}
      </main>

      <Dialogo abierto={propuestaId !== null} onCerrar={() => setPropuestaId(null)} titulo={detalle?.titulo ?? 'Propuesta'}>
        {detalleEstado === 'cargando' ? <EstadoCarga>Cargando…</EstadoCarga> : null}
        {detalleEstado === 'error' ? <EstadoError titulo="No pudimos cargar la propuesta" /> : null}
        {detalleEstado === 'ok' && detalle ? (
          <form onSubmit={guardarRevision} noValidate>
            {formError ? <Alerta tipo="error">{formError}</Alerta> : null}

            <div className="dato">
              <span className="dato__k">Autor</span>
              <span className="dato__v">
                {detalle.autor.nombre} ({detalle.autor.email})
              </span>
            </div>
            <div className="dato">
              <span className="dato__k">Enviada</span>
              <span className="dato__v">{fechaCorta(detalle.creada_en)}</span>
            </div>

            <h3 style={{ fontSize: '1rem', margin: '1.1rem 0 0.4rem' }}>Descripción</h3>
            <p style={{ margin: '0 0 1rem' }}>{detalle.descripcion}</p>

            <Selector
              id="estado-revision"
              etiqueta="Estado"
              value={estadoElegido}
              onChange={(e) => setEstadoElegido(e.target.value as EstadoPropuestaAdmin)}
            >
              {opcionesEstado.map((v) => (
                <option key={v} value={v}>
                  {ESTADO[v].etiqueta}
                </option>
              ))}
            </Selector>

            <div className="campo">
              <label className="campo__label" htmlFor="feedback-admin">
                Feedback para el docente (opcional)
              </label>
              <textarea
                id="feedback-admin"
                className="campo__input"
                rows={3}
                maxLength={MAX_FEEDBACK}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <span className="campo__ayuda">{feedback.length}/{MAX_FEEDBACK}</span>
            </div>

            <div className="dialogo__acciones">
              <Boton variante="fantasma" type="button" onClick={() => setPropuestaId(null)} disabled={guardando}>
                Cancelar
              </Boton>
              <Boton variante="primario" type="submit" cargando={guardando}>
                Guardar revisión
              </Boton>
            </div>
          </form>
        ) : null}
      </Dialogo>
    </>
  );
}
