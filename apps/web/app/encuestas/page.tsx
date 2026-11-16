'use client';

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alerta,
  Boton,
  Dialogo,
  EstadoCarga,
  EstadoError,
  EstadoVacio,
  IconoUrna,
  Insignia,
  Selector,
  useToast,
} from '@/components/ui';
import { SiteNav } from '@/components/site-nav';
import { fechaCorta } from '@/lib/pedidos';
import {
  api,
  ApiError,
  type EncuestaResumen,
  type EstadoEncuesta,
  type NivelEducativo,
  type ResultadosEncuesta,
} from '@/lib/api';

function BarraOpcion({ opcion, votada }: { opcion: ResultadosEncuesta['opciones'][number]; votada: boolean }) {
  return (
    <li style={{ listStyle: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
        <span>
          {opcion.texto}
          {votada ? (
            <span style={{ marginLeft: '0.4rem' }}>
              <Insignia variante="marca">Tu voto</Insignia>
            </span>
          ) : null}
        </span>
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
          {opcion.votos} ({opcion.porcentaje}%)
        </span>
      </div>
      <div style={{ background: 'var(--superficie-2)', borderRadius: '999px', height: '0.6rem', overflow: 'hidden' }}>
        <div
          style={{
            width: `${opcion.porcentaje}%`,
            height: '100%',
            background: votada ? 'var(--marca)' : 'var(--tinta-suave)',
            borderRadius: '999px',
          }}
        />
      </div>
    </li>
  );
}

export default function EncuestasPage() {
  const router = useRouter();
  const { notificar } = useToast();
  const [filtroEstado, setFiltroEstado] = useState<EstadoEncuesta | ''>('');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [niveles, setNiveles] = useState<NivelEducativo[]>([]);
  const [encuestas, setEncuestas] = useState<EncuestaResumen[] | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  const [pollId, setPollId] = useState<string | null>(null);
  const [resultados, setResultados] = useState<ResultadosEncuesta | null>(null);
  const [detalleEstado, setDetalleEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [opcionElegida, setOpcionElegida] = useState('');
  const [votando, setVotando] = useState(false);
  const [errorVoto, setErrorVoto] = useState<string | null>(null);
  // CU-14 A7 / CU-16 A5: los resultados se pueden ver sin votar, y el anónimo los ve con un aviso
  // para iniciar sesión en vez del formulario. `null` mientras no se sabe si hay sesión.
  const [logueado, setLogueado] = useState<boolean | null>(null);
  const [vista, setVista] = useState<'votar' | 'resultados'>('resultados');

  useEffect(() => {
    api
      .me()
      .then(() => setLogueado(true))
      .catch(() => setLogueado(false));
  }, []);

  function cargar(): void {
    setEstado('cargando');
    api
      .listarEncuestas(filtroEstado || undefined, filtroNivel || undefined)
      .then((r) => {
        setEncuestas(r);
        setEstado('ok');
      })
      .catch(() => setEstado('error'));
  }

  useEffect(cargar, [filtroEstado, filtroNivel]);

  // Bloque E: catálogo de niveles para el filtro — falla silenciosa, si no carga el selector
  // simplemente queda sin opciones y el resto de la página funciona igual.
  useEffect(() => {
    api.listarNiveles().then(setNiveles).catch(() => undefined);
  }, []);

  async function abrirEncuesta(id: string): Promise<void> {
    setPollId(id);
    setResultados(null);
    setDetalleEstado('cargando');
    setErrorVoto(null);
    setOpcionElegida('');
    try {
      const r = await api.verResultadosEncuesta(id);
      setResultados(r);
      // Arranca en el formulario solo si de verdad puede votar; si no, en los resultados.
      setVista(r.estado === 'active' && !r.ya_voto && logueado === true ? 'votar' : 'resultados');
      setDetalleEstado('ok');
    } catch {
      setDetalleEstado('error');
    }
  }

  async function votar(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!pollId || !opcionElegida) return;
    setErrorVoto(null);
    setVotando(true);
    try {
      const r = await api.votarEncuesta(pollId, opcionElegida);
      setResultados(r);
      setVista('resultados');
      notificar('¡Voto registrado! Gracias por participar.', 'ok');
      cargar(); // refleja el nuevo total_votos en la lista
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?volver=/encuestas');
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        // ya había votado (ej. en otra pestaña) — mostramos los resultados igual.
        notificar('Ya habías votado en esta encuesta.', 'info');
        const r = await api.verResultadosEncuesta(pollId).catch(() => null);
        if (r) setResultados(r);
        setVista('resultados');
      } else if (err instanceof ApiError && err.status === 422) {
        setErrorVoto(err.problema.detail ?? 'No pudimos registrar tu voto.');
      } else {
        setErrorVoto('No pudimos conectar. Revisá tu conexión.');
      }
    } finally {
      setVotando(false);
    }
  }

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem' }}>
        <p className="eyebrow">Comunidad</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', margin: '0.3rem 0 1.2rem' }}>Encuestas</h1>

        <div className="filtros">
          <Selector
            id="filtro-estado"
            etiqueta="Estado"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as EstadoEncuesta | '')}
          >
            <option value="">Todas</option>
            <option value="active">Activas</option>
            <option value="closed">Finalizadas</option>
          </Selector>
          <Selector
            id="filtro-nivel"
            etiqueta="Nivel educativo"
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value)}
          >
            <option value="">Todos</option>
            {niveles.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nombre}
              </option>
            ))}
          </Selector>
        </div>

        {estado === 'cargando' ? <EstadoCarga>Cargando encuestas…</EstadoCarga> : null}
        {estado === 'error' ? (
          <EstadoError titulo="No pudimos cargar las encuestas">
            <Boton variante="primario" onClick={cargar}>
              Reintentar
            </Boton>
          </EstadoError>
        ) : null}

        {estado === 'ok' && encuestas && encuestas.length === 0 ? (
          <EstadoVacio icono={<IconoUrna size={40} />} titulo="No hay encuestas para mostrar">
            Probá cambiar el filtro de estado.
          </EstadoVacio>
        ) : null}

        {estado === 'ok' && encuestas && encuestas.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {encuestas.map((enc) => (
              <div
                key={enc.id}
                className="tarjeta"
                style={{
                  padding: '1rem 1.2rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <p style={{ margin: '0 0 0.3rem', fontWeight: 600 }}>{enc.pregunta}</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--tinta-suave)' }}>
                    <Insignia variante={enc.estado === 'active' ? 'ok' : 'off'}>
                      {enc.estado === 'active' ? 'Activa' : 'Finalizada'}
                    </Insignia>{' '}
                    {enc.nivel_educativo_id ? (
                      <>
                        <Insignia variante="neutra">
                          {niveles.find((n) => n.id === enc.nivel_educativo_id)?.nombre ?? 'Nivel'}
                        </Insignia>{' '}
                      </>
                    ) : null}
                    {enc.total_votos} voto{enc.total_votos === 1 ? '' : 's'} ·{' '}
                    {enc.finalizada_en
                      ? `finalizada el ${fechaCorta(enc.finalizada_en)}`
                      : fechaCorta(enc.creada_en)}
                  </p>
                </div>
                <Boton variante="fantasma" onClick={() => abrirEncuesta(enc.id)}>
                  {enc.estado === 'active' ? 'Ver / Votar' : 'Ver resultados'}
                </Boton>
              </div>
            ))}
          </div>
        ) : null}
      </main>

      <Dialogo abierto={pollId !== null} onCerrar={() => setPollId(null)} titulo={resultados?.pregunta ?? 'Encuesta'}>
        {detalleEstado === 'cargando' ? <EstadoCarga>Cargando…</EstadoCarga> : null}
        {detalleEstado === 'error' ? (
          <EstadoError titulo="La encuesta que buscás no está disponible" />
        ) : null}

        {detalleEstado === 'ok' && resultados && vista === 'resultados' ? (
          <div>
            {resultados.estado === 'closed' ? (
              // CU-16 RN-004: indicador "Finalizada" (con su fecha).
              <p style={{ margin: '0 0 0.8rem' }}>
                <Insignia variante="off">Finalizada</Insignia>
                {resultados.finalizada_en ? (
                  <span style={{ marginLeft: '0.4rem', fontSize: '0.85rem', color: 'var(--tinta-suave)' }}>
                    el {fechaCorta(resultados.finalizada_en)} · resultados definitivos
                  </span>
                ) : null}
              </p>
            ) : null}
            <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {resultados.opciones.map((o) => (
                <BarraOpcion key={o.id} opcion={o} votada={o.id === resultados.opcion_votada_id} />
              ))}
            </ul>
            <p style={{ marginTop: '0.9rem', fontSize: '0.85rem', color: 'var(--tinta-suave)' }}>
              {resultados.total_votos === 0
                ? 'Sin votos aún.' // CU-16 RN-007
                : `${resultados.total_votos} voto${resultados.total_votos === 1 ? '' : 's'} en total.`}
            </p>
            {resultados.estado === 'active' && !resultados.ya_voto && logueado === false ? (
              // CU-16 A5 / RN-008: el anónimo ve resultados pero no vota.
              <Alerta tipo="aviso">
                Para votar, <Link href="/login?volver=/encuestas">iniciá sesión</Link>.
              </Alerta>
            ) : null}
            {resultados.estado === 'active' && !resultados.ya_voto && logueado === true ? (
              <div className="dialogo__acciones">
                <Boton variante="primario" type="button" onClick={() => setVista('votar')}>
                  Participar
                </Boton>
              </div>
            ) : null}
          </div>
        ) : null}

        {detalleEstado === 'ok' && resultados && vista === 'votar' ? (
          <form onSubmit={votar} noValidate>
            {errorVoto ? <Alerta tipo="error">{errorVoto}</Alerta> : null}
            <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend className="campo__label" style={{ marginBottom: '0.5rem' }}>
                Elegí una opción
              </legend>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {resultados.opciones.map((o) => (
                  <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="opcion"
                      value={o.id}
                      checked={opcionElegida === o.id}
                      onChange={() => setOpcionElegida(o.id)}
                    />
                    {o.texto}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="dialogo__acciones">
              {/* CU-14 A7: ver los resultados sin participar (no registra voto). */}
              <Boton variante="fantasma" type="button" onClick={() => setVista('resultados')} disabled={votando}>
                Ver resultados
              </Boton>
              <Boton variante="primario" type="submit" cargando={votando} disabled={!opcionElegida}>
                Votar
              </Boton>
            </div>
          </form>
        ) : null}
      </Dialogo>
    </>
  );
}
