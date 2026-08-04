'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alerta,
  Boton,
  Campo,
  EstadoCarga,
  EstadoError,
  EstadoVacio,
  Insignia,
  Selector,
  Tabla,
  useToast,
  type ColumnaTabla,
} from '@/components/ui';
import { SiteNav } from '@/components/site-nav';
import { fechaCorta } from '@/lib/pedidos';
import { api, ApiError, type EstadoPropuesta, type Materia, type MiPropuesta, type NivelEducativo } from '@/lib/api';

const ESTADO_PROPUESTA: Record<EstadoPropuesta, { etiqueta: string; variante: 'default' | 'ok' | 'off' | 'neutra' }> = {
  pending: { etiqueta: 'Pendiente', variante: 'default' },
  reviewed: { etiqueta: 'En revisión', variante: 'neutra' },
  approved: { etiqueta: 'Aprobada', variante: 'ok' },
  rejected: { etiqueta: 'Rechazada', variante: 'off' },
};

const MIN_DESCRIPCION = 50;

export default function PropuestasPage() {
  const router = useRouter();
  const { notificar } = useToast();
  const [propuestas, setPropuestas] = useState<MiPropuesta[] | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  const [materias, setMaterias] = useState<Materia[]>([]);
  const [niveles, setNiveles] = useState<NivelEducativo[]>([]);
  const [form, setForm] = useState({ titulo: '', descripcion: '', materiaId: '', nivelId: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function cargar(): void {
    setEstado('cargando');
    api
      .misPropuestas()
      .then((r) => {
        setPropuestas(r);
        setEstado('ok');
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/propuestas');
        else setEstado('error');
      });
  }

  useEffect(cargar, [router]);

  // Bloque E: catálogo de materias/niveles para los selectores opcionales del form — público,
  // no depende de la sesión. Falla silenciosa: sin catálogo, los selectores quedan sin opciones.
  useEffect(() => {
    api.listarMaterias().then(setMaterias).catch(() => undefined);
    api.listarNiveles().then(setNiveles).catch(() => undefined);
  }, []);

  async function enviar(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setFormError(null);

    if (!form.titulo.trim() || !form.descripcion.trim()) {
      setFormError('Completá todos los campos obligatorios (Título y Descripción).');
      return;
    }
    if (form.descripcion.trim().length < MIN_DESCRIPCION) {
      setFormError(
        'La descripción debe tener al menos 50 caracteres para asegurar calidad. Detallá mejor tu propuesta.',
      );
      return;
    }

    setEnviando(true);
    try {
      await api.enviarPropuesta({
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        materia_id: form.materiaId || null,
        nivel_educativo_id: form.nivelId || null,
      });
      notificar('¡Propuesta enviada! Quedará en revisión.', 'ok');
      setForm({ titulo: '', descripcion: '', materiaId: '', nivelId: '' });
      cargar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?volver=/propuestas');
        return;
      }
      if (err instanceof ApiError && (err.status === 409 || err.status === 422)) {
        setFormError(err.problema.detail ?? 'No pudimos enviar tu propuesta.');
      } else {
        setFormError('No pudimos conectar. Revisá tu conexión.');
      }
    } finally {
      setEnviando(false);
    }
  }

  const columnas: ColumnaTabla<MiPropuesta>[] = [
    { clave: 'titulo', encabezado: 'Título', render: (p) => p.titulo },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (p) => <Insignia variante={ESTADO_PROPUESTA[p.estado].variante}>{ESTADO_PROPUESTA[p.estado].etiqueta}</Insignia>,
    },
    { clave: 'creada', encabezado: 'Enviada', render: (p) => fechaCorta(p.creada_en) },
  ];

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem' }}>
        <p className="eyebrow">Comunidad</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', margin: '0.3rem 0 1.2rem' }}>
          Proponé un juego
        </h1>

        <form className="tarjeta" onSubmit={enviar} noValidate style={{ marginBottom: '1.6rem' }}>
          {formError ? <Alerta tipo="error">{formError}</Alerta> : null}
          <Campo
            id="titulo"
            etiqueta="Título"
            required
            value={form.titulo}
            onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
          />
          <div className="campo">
            <label className="campo__label" htmlFor="descripcion">
              Descripción
            </label>
            <textarea
              id="descripcion"
              className="campo__input"
              rows={4}
              required
              minLength={MIN_DESCRIPCION}
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            />
            <span className="campo__ayuda">
              {form.descripcion.trim().length}/{MIN_DESCRIPCION} caracteres mínimo
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <Selector
              id="materia"
              etiqueta="Materia (opcional)"
              value={form.materiaId}
              onChange={(e) => setForm((f) => ({ ...f, materiaId: e.target.value }))}
            >
              <option value="">Sin especificar</option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </Selector>
            <Selector
              id="nivel-educativo"
              etiqueta="Nivel educativo (opcional)"
              value={form.nivelId}
              onChange={(e) => setForm((f) => ({ ...f, nivelId: e.target.value }))}
            >
              <option value="">Sin especificar</option>
              {niveles.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nombre}
                </option>
              ))}
            </Selector>
          </div>
          <Boton variante="primario" type="submit" cargando={enviando}>
            Enviar propuesta
          </Boton>
        </form>

        <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.8rem' }}>Mis propuestas enviadas</h2>

        {estado === 'cargando' ? <EstadoCarga>Cargando…</EstadoCarga> : null}
        {estado === 'error' ? (
          <EstadoError titulo="No pudimos cargar tus propuestas">
            <Boton variante="primario" onClick={cargar}>
              Reintentar
            </Boton>
          </EstadoError>
        ) : null}
        {estado === 'ok' && propuestas && propuestas.length === 0 ? (
          <EstadoVacio icono="💡" titulo="Todavía no enviaste ninguna propuesta">
            Usá el formulario de arriba para proponer un juego.
          </EstadoVacio>
        ) : null}
        {estado === 'ok' && propuestas && propuestas.length > 0 ? (
          <Tabla columnas={columnas} filas={propuestas} claveFila={(p) => p.id} />
        ) : null}
      </main>
    </>
  );
}
