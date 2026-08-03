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
  Tabla,
  useToast,
  type ColumnaTabla,
} from '@/components/ui';
import { SiteNav } from '@/components/site-nav';
import { fechaCorta } from '@/lib/pedidos';
import { api, ApiError, type MiJuegoAsignado } from '@/lib/api';

const HOY = new Date().toISOString().slice(0, 10);

export default function MisJuegosPage() {
  const router = useRouter();
  const { notificar } = useToast();
  const [juegos, setJuegos] = useState<MiJuegoAsignado[] | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  const [juego, setJuego] = useState<MiJuegoAsignado | null>(null);
  const [form, setForm] = useState({
    fecha_uso: HOY,
    grupo: '',
    cantidad_estudiantes: '',
    duracion_minutos: '',
    satisfaccion_docente: '',
    aprendizajes_clave: '',
    dificultades: '',
    reutilizaria: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function cargar(): void {
    setEstado('cargando');
    api
      .misJuegosAsignados()
      .then((r) => {
        setJuegos(r.juegos);
        setEstado('ok');
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/mis-juegos');
        else setEstado('error');
      });
  }

  useEffect(cargar, [router]);

  function abrirCargarSesion(j: MiJuegoAsignado): void {
    setJuego(j);
    setForm({
      fecha_uso: HOY,
      grupo: '',
      cantidad_estudiantes: '',
      duracion_minutos: '',
      satisfaccion_docente: '',
      aprendizajes_clave: '',
      dificultades: '',
      reutilizaria: '',
    });
    setFormError(null);
  }

  async function guardarSesion(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!juego) return;
    setFormError(null);

    // RNF-002: validaciones en el cliente, mismo texto que las alt-flows del CU (A2-A6).
    if (!form.grupo.trim() || !form.cantidad_estudiantes || !form.duracion_minutos || !form.satisfaccion_docente || !form.reutilizaria) {
      setFormError('Completá todos los campos obligatorios para registrar la sesión.');
      return;
    }
    if (form.fecha_uso > HOY) {
      setFormError('La fecha de uso no puede ser futura. Seleccioná una fecha válida.');
      return;
    }
    if (Number(form.cantidad_estudiantes) <= 0) {
      setFormError('La cantidad de estudiantes debe ser mayor a 0.');
      return;
    }
    if (Number(form.duracion_minutos) <= 0) {
      setFormError('La duración debe ser mayor a 0 minutos.');
      return;
    }
    if (form.aprendizajes_clave.trim().length < 20) {
      setFormError(
        'Los aprendizajes clave deben tener al menos 20 caracteres. Compartí más detalles sobre lo que aprendieron los estudiantes.',
      );
      return;
    }

    setEnviando(true);
    try {
      await api.cargarSesion({
        producto_id: juego.producto_id,
        fecha_uso: form.fecha_uso,
        grupo: form.grupo.trim(),
        cantidad_estudiantes: Number(form.cantidad_estudiantes),
        duracion_minutos: Number(form.duracion_minutos),
        satisfaccion_docente: Number(form.satisfaccion_docente),
        aprendizajes_clave: form.aprendizajes_clave.trim(),
        dificultades: form.dificultades.trim() || null,
        reutilizaria: form.reutilizaria === 'si',
      });
      notificar('¡Sesión registrada exitosamente! Gracias por compartir tu experiencia.', 'ok');
      setJuego(null);
      cargar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?volver=/mis-juegos');
        return;
      }
      if (err instanceof ApiError && (err.status === 403 || err.status === 422)) {
        setFormError(err.problema.detail ?? 'No pudimos registrar la sesión.');
      } else {
        setFormError('Error de conexión. No se pudo registrar la sesión. Intentá nuevamente más tarde.');
      }
    } finally {
      setEnviando(false);
    }
  }

  const columnas: ColumnaTabla<MiJuegoAsignado>[] = [
    { clave: 'nombre', encabezado: 'Juego', render: (j) => j.nombre_producto },
    { clave: 'cantidad', encabezado: 'Cantidad asignada', alinear: 'derecha', render: (j) => j.cantidad },
    { clave: 'sesiones', encabezado: 'Sesiones cargadas', alinear: 'derecha', render: (j) => j.total_sesiones },
    {
      clave: 'ultima',
      encabezado: 'Última sesión',
      render: (j) => (j.ultima_sesion_en ? fechaCorta(j.ultima_sesion_en) : '—'),
    },
    {
      clave: 'acciones',
      encabezado: '',
      render: (j) => (
        <span style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Boton
            variante="fantasma"
            href={`/mis-sesiones?producto_id=${j.producto_id}`}
          >
            Ver historial
          </Boton>
          <Boton variante="primario" onClick={() => abrirCargarSesion(j)}>
            Cargar sesión
          </Boton>
        </span>
      ),
    },
  ];

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem' }}>
        <p className="eyebrow">Mis juegos</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', margin: '0.3rem 0 1.2rem' }}>Juegos asignados</h1>

        {estado === 'cargando' ? <EstadoCarga>Cargando tus juegos asignados…</EstadoCarga> : null}

        {estado === 'error' ? (
          <EstadoError titulo="No pudimos cargar tus juegos asignados">
            <Boton variante="primario" onClick={cargar}>
              Reintentar
            </Boton>
          </EstadoError>
        ) : null}

        {estado === 'ok' && juegos && juegos.length === 0 ? (
          <EstadoVacio icono="🎲" titulo="Aún no tenés juegos asignados por tu institución">
            Contactá a tu encargado institucional para solicitar licencias.
          </EstadoVacio>
        ) : null}

        {estado === 'ok' && juegos && juegos.length > 0 ? (
          <Tabla columnas={columnas} filas={juegos} claveFila={(j) => j.producto_id} />
        ) : null}
      </main>

      <Dialogo abierto={juego !== null} onCerrar={() => setJuego(null)} titulo={`Cargar sesión — ${juego?.nombre_producto ?? ''}`}>
        <form onSubmit={guardarSesion} noValidate>
          {formError ? <Alerta tipo="error">{formError}</Alerta> : null}

          <Campo
            id="fecha-uso"
            etiqueta="Fecha de uso"
            type="date"
            required
            max={HOY}
            value={form.fecha_uso}
            onChange={(e) => setForm((f) => ({ ...f, fecha_uso: e.target.value }))}
          />
          <Campo
            id="grupo"
            etiqueta="Grupo / curso"
            placeholder="Ej: 4to B"
            required
            value={form.grupo}
            onChange={(e) => setForm((f) => ({ ...f, grupo: e.target.value }))}
          />
          <Campo
            id="cantidad-estudiantes"
            etiqueta="Cantidad de estudiantes"
            type="number"
            min={1}
            required
            value={form.cantidad_estudiantes}
            onChange={(e) => setForm((f) => ({ ...f, cantidad_estudiantes: e.target.value }))}
          />
          <Campo
            id="duracion-minutos"
            etiqueta="Duración (minutos)"
            type="number"
            min={1}
            required
            value={form.duracion_minutos}
            onChange={(e) => setForm((f) => ({ ...f, duracion_minutos: e.target.value }))}
          />

          <fieldset className="campo" style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className="campo__label">Satisfacción con la sesión</legend>
            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="satisfaccion"
                    value={n}
                    checked={form.satisfaccion_docente === String(n)}
                    onChange={() => setForm((f) => ({ ...f, satisfaccion_docente: String(n) }))}
                  />
                  {'★'.repeat(n)} <span style={{ color: 'var(--tinta-suave)' }}>({n})</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="campo">
            <label className="campo__label" htmlFor="aprendizajes">
              Aprendizajes clave
            </label>
            <textarea
              id="aprendizajes"
              className="campo__input"
              rows={3}
              required
              minLength={20}
              value={form.aprendizajes_clave}
              onChange={(e) => setForm((f) => ({ ...f, aprendizajes_clave: e.target.value }))}
            />
            <span className="campo__ayuda">{form.aprendizajes_clave.trim().length}/20 caracteres mínimo</span>
          </div>

          <div className="campo">
            <label className="campo__label" htmlFor="dificultades">
              Dificultades encontradas (opcional)
            </label>
            <textarea
              id="dificultades"
              className="campo__input"
              rows={2}
              value={form.dificultades}
              onChange={(e) => setForm((f) => ({ ...f, dificultades: e.target.value }))}
            />
          </div>

          <fieldset className="campo" style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className="campo__label">¿Reutilizarías el juego?</legend>
            <div style={{ display: 'flex', gap: '1.2rem', marginTop: '0.3rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="reutilizaria"
                  checked={form.reutilizaria === 'si'}
                  onChange={() => setForm((f) => ({ ...f, reutilizaria: 'si' }))}
                />
                Sí
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="reutilizaria"
                  checked={form.reutilizaria === 'no'}
                  onChange={() => setForm((f) => ({ ...f, reutilizaria: 'no' }))}
                />
                No
              </label>
            </div>
          </fieldset>

          <div className="dialogo__acciones">
            <Boton variante="fantasma" type="button" onClick={() => setJuego(null)} disabled={enviando}>
              Cancelar
            </Boton>
            <Boton variante="primario" type="submit" cargando={enviando}>
              Guardar sesión
            </Boton>
          </div>
        </form>
      </Dialogo>
    </>
  );
}
