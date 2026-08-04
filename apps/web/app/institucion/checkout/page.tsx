'use client';

import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alerta, Boton, Campo, EstadoCarga } from '@/components/ui';
import { precioARS, SiteNav } from '@/components/site-nav';
import { api, ApiError, type ModalidadEnvio, type OpcionEnvio } from '@/lib/api';

type EstadoEnvio = 'inactivo' | 'calculando' | 'ok' | 'error';

export default function CheckoutInstitucionalPage() {
  const router = useRouter();
  const [institucionId, setInstitucionId] = useState<string | null>(null);
  const [resolviendo, setResolviendo] = useState(true);
  const [sinPermiso, setSinPermiso] = useState(false);

  const [datos, setDatos] = useState({
    calle: '',
    numero: '',
    codigo_postal: '',
    provincia: '',
    localidad: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const [envioEstado, setEnvioEstado] = useState<EstadoEnvio>('inactivo');
  const [envioError, setEnvioError] = useState<string | null>(null);
  const [opciones, setOpciones] = useState<OpcionEnvio[]>([]);
  const [modalidad, setModalidad] = useState<ModalidadEnvio | null>(null);

  useEffect(() => {
    api
      .miInstitucion()
      .then((mia) => {
        if (mia.institucion_id === null) {
          router.replace('/institucion');
          return;
        }
        if (!mia.es_encargado) {
          setSinPermiso(true);
          setResolviendo(false);
          return;
        }
        setInstitucionId(mia.institucion_id);
        setResolviendo(false);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/institucion/checkout');
        else setResolviendo(false);
      });
  }, [router]);

  const set =
    (campo: keyof typeof datos) =>
    (e: ChangeEvent<HTMLInputElement>): void => {
      setDatos((d) => ({ ...d, [campo]: e.target.value }));
      if (campo === 'codigo_postal') {
        setEnvioEstado('inactivo');
        setOpciones([]);
        setModalidad(null);
      }
    };

  async function calcularEnvio(): Promise<void> {
    if (!institucionId) return;
    setEnvioError(null);
    if (!/^\d{4}$/.test(datos.codigo_postal)) {
      setEnvioError('Ingresá un código postal de 4 dígitos (ej: 1425).');
      return;
    }
    setEnvioEstado('calculando');
    try {
      const carrito = await api.verCarrito(institucionId);
      if (carrito.lineas.length === 0) {
        setEnvioError('El carrito institucional está vacío.');
        setEnvioEstado('error');
        return;
      }
      const r = await api.calcularEnvio(
        datos.codigo_postal,
        carrito.lineas.map((l) => ({ product_id: l.juego_id, quantity: l.cantidad })),
      );
      setOpciones(r.opciones);
      setModalidad(r.opciones[0]?.modalidad ?? null);
      setEnvioEstado('ok');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return router.replace('/login?volver=/institucion/checkout');
      if (err instanceof ApiError && err.status === 422) setEnvioError('Ese código postal no es válido.');
      else if (err instanceof ApiError && err.status === 503)
        setEnvioError('El servicio de envíos no está disponible ahora. Probá de nuevo en un rato.');
      else setEnvioError('No pudimos calcular el envío. Probá de nuevo.');
      setEnvioEstado('error');
    }
  }

  async function iniciar(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!modalidad || !institucionId) return;
    setError(null);
    setCargando(true);
    try {
      const r = await api.iniciarCheckout({
        modalidad_envio: modalidad,
        codigo_postal: datos.codigo_postal,
        domicilio: {
          calle: datos.calle,
          numero: datos.numero,
          codigo_postal: datos.codigo_postal,
          provincia: datos.provincia,
          localidad: datos.localidad,
        },
        contexto: institucionId,
      });
      // Redirect real a Mercado Pago (Checkout Pro): sale de la SPA, MP nos devuelve a
      // /checkout/resultado según back_urls (CU-12).
      window.location.href = r.init_point;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) return router.replace('/login?volver=/institucion/checkout');
        if (err.status === 404)
          setError('No tenés permisos de encargado institucional para esta operación.');
        else if (err.status === 409) setError('Ya tenés un pago en curso para este carrito institucional.');
        else if (err.status === 422) setError('El carrito institucional está vacío o alguna línea no tiene stock.');
        else if (err.status === 503) setError('El medio de pago no está disponible ahora. Probá en unos minutos.');
        else setError('No pudimos iniciar el checkout institucional. Probá de nuevo.');
      } else {
        setError('No pudimos conectar. Revisá tu conexión.');
      }
      setCargando(false);
    }
  }

  if (resolviendo) {
    return (
      <>
        <SiteNav />
        <main className="contenedor" style={{ paddingTop: '2.2rem' }}>
          <EstadoCarga>Cargando…</EstadoCarga>
        </main>
      </>
    );
  }

  if (sinPermiso) {
    return (
      <>
        <SiteNav />
        <main className="contenedor" style={{ paddingTop: '2.2rem' }}>
          <Alerta tipo="aviso">
            Solo los encargados institucionales pueden realizar compras en lote. Contactá a tu
            encargado para solicitar permisos.
          </Alerta>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem', maxWidth: '640px' }}>
        <p className="eyebrow">Checkout institucional</p>

        <h1 style={{ fontSize: 'clamp(1.7rem, 5vw, 2.4rem)', margin: '0.3rem 0 0.8rem' }}>
          Datos de envío de la institución
        </h1>
        <form onSubmit={iniciar} noValidate>
              {error ? <Alerta tipo="error">{error}</Alerta> : null}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.9rem' }}>
                <Campo id="calle" etiqueta="Calle" required value={datos.calle} onChange={set('calle')} />
                <Campo id="numero" etiqueta="Número" required value={datos.numero} onChange={set('numero')} />
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <Campo
                    id="codigo_postal"
                    etiqueta="Código postal"
                    required
                    placeholder="1425"
                    error={envioError ?? undefined}
                    value={datos.codigo_postal}
                    onChange={set('codigo_postal')}
                  />
                </div>
                <Boton
                  variante="fantasma"
                  type="button"
                  cargando={envioEstado === 'calculando'}
                  onClick={calcularEnvio}
                  disabled={!datos.codigo_postal}
                  style={{ marginBottom: '1rem' }}
                >
                  Calcular envío
                </Boton>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                <Campo id="localidad" etiqueta="Localidad" required value={datos.localidad} onChange={set('localidad')} />
                <Campo id="provincia" etiqueta="Provincia" required value={datos.provincia} onChange={set('provincia')} />
              </div>

              {envioEstado === 'calculando' ? <EstadoCarga>Buscando opciones de envío…</EstadoCarga> : null}

              {envioEstado === 'ok' && opciones.length > 0 ? (
                <div className="campo">
                  <span className="campo__label">Elegí una opción de envío</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {opciones.map((o) => (
                      <label
                        key={o.modalidad}
                        className="tarjeta"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.8rem',
                          padding: '0.85rem 1.1rem',
                          cursor: 'pointer',
                          borderColor: modalidad === o.modalidad ? 'var(--marca)' : undefined,
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                          <input
                            type="radio"
                            name="modalidad_envio"
                            checked={modalidad === o.modalidad}
                            onChange={() => setModalidad(o.modalidad)}
                          />
                          <span>
                            <strong>{o.nombre_servicio}</strong>
                            <br />
                            <span style={{ fontSize: '0.85rem', color: 'var(--tinta-suave)' }}>
                              Llega en {o.plazo_estimado_dias} día{o.plazo_estimado_dias === 1 ? '' : 's'} hábiles
                              {o.tracking_disponible ? ' · con seguimiento' : ''}
                            </span>
                          </span>
                        </span>
                        <strong>{precioARS(o.costo)}</strong>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <button
                className="boton boton--primario boton--bloque"
                type="submit"
                disabled={cargando || !modalidad}
                style={{ marginTop: '1.2rem' }}
              >
                {cargando ? 'Creando pedido…' : 'Continuar al pago'}
              </button>
              <p style={{ textAlign: 'center', margin: '0.9rem 0 0' }}>
                <Link href="/institucion/carrito">← Volver al carrito institucional</Link>
              </p>
        </form>
      </main>
    </>
  );
}
