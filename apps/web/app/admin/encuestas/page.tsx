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
import { api, ApiError, type EncuestaAdminResumen, type NivelEducativo } from '@/lib/api';

const ESTADO: Record<string, { etiqueta: string; variante: 'default' | 'ok' | 'off' | 'neutra' }> = {
  draft: { etiqueta: 'Borrador', variante: 'default' },
  active: { etiqueta: 'Activa', variante: 'ok' },
  closed: { etiqueta: 'Cerrada', variante: 'off' },
};

const MIN_OPCIONES = 2;
const MAX_OPCIONES = 10;

export default function AdminEncuestasPage() {
  const router = useRouter();
  const { notificar } = useToast();
  const [esAdmin, setEsAdmin] = useState<boolean | null>(null);
  const [encuestas, setEncuestas] = useState<EncuestaAdminResumen[] | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  const [niveles, setNiveles] = useState<NivelEducativo[]>([]);

  const [edicion, setEdicion] = useState<EncuestaAdminResumen | 'nueva' | null>(null);
  const [pregunta, setPregunta] = useState('');
  const [nivelEducativoId, setNivelEducativoId] = useState('');
  const [opciones, setOpciones] = useState<string[]>(['', '']);
  const [formEstado, setFormEstado] = useState<'cargando' | 'ok'>('ok');
  const [formError, setFormError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [aEliminar, setAEliminar] = useState<EncuestaAdminResumen | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [alternando, setAlternando] = useState<string | null>(null);

  function cargar(): void {
    setEstado('cargando');
    api
      .listarEncuestasAdmin()
      .then((r) => {
        setEncuestas(r);
        setEstado('ok');
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/admin/encuestas');
        else setEstado('error');
      });
  }

  useEffect(() => {
    api
      .me()
      .then((p) => {
        setEsAdmin(p.es_admin);
        if (p.es_admin) {
          cargar();
          api.listarNiveles().then(setNiveles).catch(() => undefined);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/admin/encuestas');
        else setEsAdmin(false);
      });
  }, [router]);

  function abrirNueva(): void {
    setEdicion('nueva');
    setPregunta('');
    setNivelEducativoId('');
    setOpciones(['', '']);
    setFormError(null);
    setFormEstado('ok');
  }

  async function abrirEditar(row: EncuestaAdminResumen): Promise<void> {
    setEdicion(row);
    setFormError(null);
    setFormEstado('cargando');
    try {
      const d = await api.verEncuestaAdmin(row.id);
      setPregunta(d.pregunta);
      setNivelEducativoId(d.nivel_educativo_id ?? '');
      setOpciones(d.opciones.map((o) => o.texto));
      setFormEstado('ok');
    } catch {
      setFormError('No pudimos cargar la encuesta.');
      setFormEstado('ok');
    }
  }

  function cambiarOpcion(i: number, valor: string): void {
    setOpciones((prev) => prev.map((o, idx) => (idx === i ? valor : o)));
  }

  function agregarOpcion(): void {
    setOpciones((prev) => (prev.length < MAX_OPCIONES ? [...prev, ''] : prev));
  }

  function quitarOpcion(i: number): void {
    setOpciones((prev) => (prev.length > MIN_OPCIONES ? prev.filter((_, idx) => idx !== i) : prev));
  }

  async function guardar(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setFormError(null);

    if (!pregunta.trim()) {
      setFormError('La pregunta de la encuesta es obligatoria.');
      return;
    }
    const limpias = opciones.map((o) => o.trim());
    if (limpias.some((o) => !o)) {
      setFormError('Todas las opciones deben tener texto.');
      return;
    }
    if (new Set(limpias.map((o) => o.toLowerCase())).size !== limpias.length) {
      setFormError('Las opciones no pueden duplicarse.');
      return;
    }

    setGuardando(true);
    try {
      if (edicion === 'nueva') {
        await api.crearEncuestaAdmin({
          pregunta: pregunta.trim(),
          nivel_educativo_id: nivelEducativoId || null,
          opciones: limpias,
        });
        notificar('Encuesta creada como borrador.', 'ok');
      } else if (edicion) {
        await api.actualizarEncuestaAdmin(edicion.id, {
          pregunta: pregunta.trim(),
          nivel_educativo_id: nivelEducativoId || null,
          opciones: limpias,
        });
        notificar('Encuesta actualizada.', 'ok');
      }
      setEdicion(null);
      cargar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?volver=/admin/encuestas');
        return;
      }
      if (err instanceof ApiError && (err.status === 422 || err.status === 404 || err.status === 409)) {
        setFormError(err.problema.detail ?? 'No pudimos guardar la encuesta.');
      } else {
        setFormError('No pudimos conectar. Revisá tu conexión.');
      }
    } finally {
      setGuardando(false);
    }
  }

  async function alternar(row: EncuestaAdminResumen): Promise<void> {
    setAlternando(row.id);
    try {
      await api.alternarEstadoEncuestaAdmin(row.id);
      notificar(row.estado === 'draft' ? 'Encuesta activada.' : 'Encuesta desactivada.', 'ok');
      cargar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?volver=/admin/encuestas');
        return;
      }
      notificar('No pudimos cambiar el estado de la encuesta.', 'error');
    } finally {
      setAlternando(null);
    }
  }

  async function confirmarEliminar(): Promise<void> {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await api.eliminarEncuestaAdmin(aEliminar.id);
      notificar('Encuesta eliminada.', 'ok');
      setAEliminar(null);
      cargar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?volver=/admin/encuestas');
        return;
      }
      notificar('No pudimos eliminar la encuesta.', 'error');
      setAEliminar(null);
    } finally {
      setEliminando(false);
    }
  }

  const columnas: ColumnaTabla<EncuestaAdminResumen>[] = [
    { clave: 'pregunta', encabezado: 'Pregunta', render: (e) => e.pregunta },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (e) => <Insignia variante={ESTADO[e.estado]!.variante}>{ESTADO[e.estado]!.etiqueta}</Insignia>,
    },
    { clave: 'votos', encabezado: 'Votos', alinear: 'derecha', render: (e) => e.total_votos },
    { clave: 'creada', encabezado: 'Creada', render: (e) => fechaCorta(e.creada_en) },
    {
      clave: 'acciones',
      encabezado: '',
      render: (e) => (
        <span style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {e.estado !== 'closed' ? (
            <Boton variante="fantasma" onClick={() => alternar(e)} cargando={alternando === e.id}>
              {e.estado === 'draft' ? 'Activar' : 'Desactivar'}
            </Boton>
          ) : null}
          {e.estado !== 'active' ? (
            <Boton variante="fantasma" onClick={() => abrirEditar(e)}>
              Editar
            </Boton>
          ) : null}
          <Boton variante="peligro" onClick={() => setAEliminar(e)}>
            Eliminar
          </Boton>
        </span>
      ),
    },
  ];

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem' }}>
        <p className="eyebrow">Administración</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', margin: '0.3rem 0 1.2rem' }}>Encuestas</h1>

        {esAdmin === false ? (
          <Alerta tipo="aviso">No tenés permisos de administrador para acceder a esta sección.</Alerta>
        ) : null}

        {esAdmin ? (
          <>
            {estado === 'cargando' ? <EstadoCarga>Cargando encuestas…</EstadoCarga> : null}
            {estado === 'error' ? (
              <EstadoError titulo="No pudimos cargar las encuestas">
                <Boton variante="primario" onClick={cargar}>
                  Reintentar
                </Boton>
              </EstadoError>
            ) : null}

            {estado === 'ok' ? (
              <div style={{ marginBottom: '1rem' }}>
                <Boton variante="primario" onClick={abrirNueva}>
                  + Nueva encuesta
                </Boton>
              </div>
            ) : null}

            {estado === 'ok' && encuestas && encuestas.length === 0 ? (
              <EstadoVacio icono="🗳️" titulo="Todavía no hay encuestas">
                Creá la primera con el botón de arriba.
              </EstadoVacio>
            ) : null}

            {estado === 'ok' && encuestas && encuestas.length > 0 ? (
              <Tabla columnas={columnas} filas={encuestas} claveFila={(e) => e.id} />
            ) : null}
          </>
        ) : null}
      </main>

      <Dialogo
        abierto={edicion !== null}
        onCerrar={() => setEdicion(null)}
        titulo={edicion === 'nueva' ? 'Nueva encuesta' : 'Editar encuesta'}
      >
        {formEstado === 'cargando' ? <EstadoCarga>Cargando…</EstadoCarga> : null}
        {formEstado === 'ok' ? (
          <form onSubmit={guardar} noValidate>
            {formError ? <Alerta tipo="error">{formError}</Alerta> : null}
            <Campo id="pregunta" etiqueta="Pregunta" required value={pregunta} onChange={(e) => setPregunta(e.target.value)} />
            <Selector
              id="nivel-educativo"
              etiqueta="Nivel educativo (opcional)"
              value={nivelEducativoId}
              onChange={(e) => setNivelEducativoId(e.target.value)}
            >
              <option value="">Todos los niveles</option>
              {niveles.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nombre}
                </option>
              ))}
            </Selector>

            <fieldset style={{ border: 'none', padding: 0, margin: '0.6rem 0' }}>
              <legend className="campo__label" style={{ marginBottom: '0.4rem' }}>
                Opciones de respuesta ({MIN_OPCIONES} a {MAX_OPCIONES})
              </legend>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {opciones.map((o, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      className="campo__input"
                      aria-label={`Opción ${i + 1}`}
                      value={o}
                      onChange={(e) => cambiarOpcion(i, e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <Boton
                      variante="fantasma"
                      type="button"
                      onClick={() => quitarOpcion(i)}
                      disabled={opciones.length <= MIN_OPCIONES}
                      aria-label={`Quitar opción ${i + 1}`}
                    >
                      Quitar
                    </Boton>
                  </div>
                ))}
              </div>
              <Boton
                variante="fantasma"
                type="button"
                onClick={agregarOpcion}
                disabled={opciones.length >= MAX_OPCIONES}
                style={{ marginTop: '0.5rem' }}
              >
                + Agregar opción
              </Boton>
            </fieldset>

            <div className="dialogo__acciones">
              <Boton variante="fantasma" type="button" onClick={() => setEdicion(null)} disabled={guardando}>
                Cancelar
              </Boton>
              <Boton variante="primario" type="submit" cargando={guardando}>
                Guardar
              </Boton>
            </div>
          </form>
        ) : null}
      </Dialogo>

      <Dialogo
        abierto={aEliminar !== null}
        onCerrar={() => setAEliminar(null)}
        titulo="¿Eliminar encuesta?"
        acciones={
          <>
            <Boton variante="fantasma" onClick={() => setAEliminar(null)} disabled={eliminando}>
              No, cancelar
            </Boton>
            <Boton variante="peligro" onClick={confirmarEliminar} cargando={eliminando}>
              Sí, eliminar
            </Boton>
          </>
        }
      >
        <p>
          Vas a eliminar <strong>{aEliminar?.pregunta}</strong> de forma permanente, junto con sus
          opciones y los votos ya registrados.
        </p>
      </Dialogo>
    </>
  );
}
