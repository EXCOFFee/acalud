'use client';

import { type ChangeEvent, type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alerta, Boton, Campo, Selector, useToast } from '@/components/ui';
import { SiteNav } from '@/components/site-nav';
import { api, ApiError } from '@/lib/api';

const NIVELES = ['Inicial', 'Primaria', 'Secundaria'];

export default function RegistrarInstitucionPage() {
  const router = useRouter();
  const { notificar } = useToast();
  const [datos, setDatos] = useState({
    nombre_legal: '',
    identificador_tributario: '',
    email_institucional: '',
    calle: '',
    numero: '',
    localidad: '',
    provincia: '',
    codigo_postal: '',
    telefono: '',
    nivel_educativo: '',
    cantidad_alumnos: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const set =
    (campo: keyof typeof datos) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void =>
      setDatos((d) => ({ ...d, [campo]: e.target.value }));

  async function enviar(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await api.registrarInstitucion({
        nombre_legal: datos.nombre_legal,
        identificador_tributario: datos.identificador_tributario,
        email_institucional: datos.email_institucional,
        domicilio: {
          calle: datos.calle,
          numero: datos.numero,
          localidad: datos.localidad,
          provincia: datos.provincia,
          codigo_postal: datos.codigo_postal,
        },
        telefono: datos.telefono.trim() || null,
        nivel_educativo: datos.nivel_educativo || null,
        cantidad_alumnos: datos.cantidad_alumnos ? Number(datos.cantidad_alumnos) : null,
      });
      notificar('¡Institución registrada!', 'ok');
      router.push('/institucion');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.push('/login?volver=/institucion/registrar');
          return;
        }
        setError(err.problema.detail ?? 'No pudimos registrar la institución. Revisá los datos.');
      } else {
        setError('No pudimos conectar. Revisá tu conexión.');
      }
      setEnviando(false);
    }
  }

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem', maxWidth: '640px' }}>
        <p className="eyebrow">Institución</p>
        <h1 style={{ fontSize: 'clamp(1.7rem, 5vw, 2.4rem)', margin: '0.3rem 0 0.3rem' }}>
          Registrá tu institución
        </h1>
        <p style={{ color: 'var(--tinta-suave)', marginBottom: '1.3rem' }}>
          Quedás como encargado principal: podrás comprar en lote, asignar licencias a docentes y
          ver reportes de uso.
        </p>

        <form onSubmit={enviar} noValidate>
          {error ? <Alerta tipo="error">{error}</Alerta> : null}

          <Campo
            id="nombre_legal"
            etiqueta="Nombre legal de la institución"
            required
            value={datos.nombre_legal}
            onChange={set('nombre_legal')}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <Campo
              id="cuit"
              etiqueta="CUIT"
              required
              placeholder="20-12345678-9"
              value={datos.identificador_tributario}
              onChange={set('identificador_tributario')}
            />
            <Campo
              id="email_institucional"
              etiqueta="Email institucional"
              type="email"
              required
              value={datos.email_institucional}
              onChange={set('email_institucional')}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.9rem' }}>
            <Campo id="calle" etiqueta="Calle" required value={datos.calle} onChange={set('calle')} />
            <Campo id="numero" etiqueta="Número" required value={datos.numero} onChange={set('numero')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <Campo id="localidad" etiqueta="Localidad" required value={datos.localidad} onChange={set('localidad')} />
            <Campo id="provincia" etiqueta="Provincia" required value={datos.provincia} onChange={set('provincia')} />
          </div>
          <Campo
            id="codigo_postal"
            etiqueta="Código postal"
            required
            value={datos.codigo_postal}
            onChange={set('codigo_postal')}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.9rem' }}>
            <Campo id="telefono" etiqueta="Teléfono (opcional)" value={datos.telefono} onChange={set('telefono')} />
            <Selector id="nivel_educativo" etiqueta="Nivel educativo (opcional)" value={datos.nivel_educativo} onChange={set('nivel_educativo')}>
              <option value="">Sin especificar</option>
              {NIVELES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Selector>
            <Campo
              id="cantidad_alumnos"
              etiqueta="Cantidad de alumnos (opcional)"
              type="number"
              min={1}
              value={datos.cantidad_alumnos}
              onChange={set('cantidad_alumnos')}
            />
          </div>

          <Boton variante="primario" bloque cargando={enviando} type="submit">
            Registrar institución
          </Boton>
        </form>
      </main>
    </>
  );
}
