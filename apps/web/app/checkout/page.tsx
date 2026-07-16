'use client';

import { type ChangeEvent, type FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alerta, Campo } from '@/components/ui';
import { SiteNav } from '@/components/site-nav';
import { api, ApiError } from '@/lib/api';

type Paso = 'form' | 'pagar' | 'resultado';

export default function CheckoutPage() {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>('form');
  const [datos, setDatos] = useState({
    modalidad: 'domicilio' as 'domicilio' | 'sucursal',
    calle: '',
    numero: '',
    codigo_postal: '',
    provincia: '',
    localidad: '',
  });
  const [pedidoId, setPedidoId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState('');

  const set =
    (campo: keyof typeof datos) =>
    (e: ChangeEvent<HTMLInputElement>): void =>
      setDatos((d) => ({ ...d, [campo]: e.target.value }));

  async function iniciar(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const r = await api.iniciarCheckout({
        modalidad_envio: datos.modalidad,
        codigo_postal: datos.codigo_postal,
        domicilio: {
          calle: datos.calle,
          numero: datos.numero,
          codigo_postal: datos.codigo_postal,
          provincia: datos.provincia,
          localidad: datos.localidad,
        },
      });
      setPedidoId(r.pedido_id);
      setPaso('pagar');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) return router.replace('/login?volver=/checkout');
        if (err.status === 403) setError('Verificá tu cuenta (revisá tu email) para poder comprar.');
        else if (err.status === 409) setError('Ya tenés un pago en curso para este carrito.');
        else if (err.status === 422) setError('Tu carrito está vacío o alguna línea no tiene stock.');
        else if (err.status === 503) setError('El medio de pago no está disponible ahora. Probá en unos minutos.');
        else setError('No pudimos iniciar el checkout. Probá de nuevo.');
      } else {
        setError('No pudimos conectar. Revisá tu conexión.');
      }
      setCargando(false);
    }
  }

  // Demo del pago (Etapa 1): en producción esto es la redirección a Mercado Pago + su webhook.
  async function pagar(aprobar: boolean): Promise<void> {
    setCargando(true);
    setError(null);
    try {
      const paymentId = `${aprobar ? 'fake-pay-' : 'fake-reject-'}${pedidoId}`;
      const r = await api.confirmarPagoDemo(paymentId);
      setResultado(r.resultado);
      setPaso('resultado');
    } catch {
      setError('No pudimos procesar el pago de prueba.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem', maxWidth: '640px' }}>
        <p className="eyebrow">Checkout</p>

        {paso === 'form' ? (
          <>
            <h1 style={{ fontSize: 'clamp(1.7rem, 5vw, 2.4rem)', margin: '0.3rem 0 0.8rem' }}>
              Datos de envío
            </h1>
            <form onSubmit={iniciar} noValidate>
              {error ? <Alerta tipo="error">{error}</Alerta> : null}
              <div className="campo">
                <span className="campo__label">Modalidad de envío</span>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  {(['domicilio', 'sucursal'] as const).map((m) => (
                    <label key={m} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      <input
                        type="radio"
                        name="modalidad"
                        checked={datos.modalidad === m}
                        onChange={() => setDatos((d) => ({ ...d, modalidad: m }))}
                      />
                      {m === 'domicilio' ? 'A domicilio' : 'Retiro en sucursal'}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.9rem' }}>
                <Campo id="calle" etiqueta="Calle" required value={datos.calle} onChange={set('calle')} />
                <Campo id="numero" etiqueta="Número" required value={datos.numero} onChange={set('numero')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                <Campo id="codigo_postal" etiqueta="Código postal" required value={datos.codigo_postal} onChange={set('codigo_postal')} />
                <Campo id="localidad" etiqueta="Localidad" required value={datos.localidad} onChange={set('localidad')} />
              </div>
              <Campo id="provincia" etiqueta="Provincia" required value={datos.provincia} onChange={set('provincia')} />
              <button className="boton boton--primario boton--bloque" type="submit" disabled={cargando}>
                {cargando ? 'Creando pedido…' : 'Continuar al pago'}
              </button>
              <p style={{ textAlign: 'center', margin: '0.9rem 0 0' }}>
                <Link href="/carrito">← Volver al carrito</Link>
              </p>
            </form>
          </>
        ) : null}

        {paso === 'pagar' ? (
          <>
            <h1 style={{ fontSize: 'clamp(1.7rem, 5vw, 2.4rem)', margin: '0.3rem 0 0.6rem' }}>Pago</h1>
            <Alerta tipo="aviso">
              Demo: en producción te redirigimos a Mercado Pago. Acá simulamos el resultado.
            </Alerta>
            {error ? <Alerta tipo="error">{error}</Alerta> : null}
            <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button className="boton boton--primario" type="button" disabled={cargando} onClick={() => pagar(true)}>
                {cargando ? 'Procesando…' : 'Pagar (aprobado)'}
              </button>
              <button className="boton boton--fantasma" type="button" disabled={cargando} onClick={() => pagar(false)}>
                Simular rechazo
              </button>
            </div>
          </>
        ) : null}

        {paso === 'resultado' ? (
          <>
            <h1 style={{ fontSize: 'clamp(1.7rem, 5vw, 2.4rem)', margin: '0.3rem 0 0.8rem' }}>
              {resultado === 'pagado' ? '¡Compra confirmada! 🎲' : 'Estado del pago'}
            </h1>
            {resultado === 'pagado' ? (
              <Alerta tipo="ok">Tu pago se acreditó y tu pedido quedó pagado. Te enviamos la confirmación por email.</Alerta>
            ) : resultado === 'rechazado' ? (
              <Alerta tipo="error">El pago fue rechazado. Tu carrito se conservó: podés reintentar.</Alerta>
            ) : (
              <Alerta tipo="aviso">Tu pedido quedó en revisión. Te contactaremos.</Alerta>
            )}
            <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1.2rem', flexWrap: 'wrap' }}>
              <Link className="boton boton--primario" href="/cuenta">Ir a mi cuenta</Link>
              <Link className="boton boton--fantasma" href="/catalogo">Seguir comprando</Link>
            </div>
          </>
        ) : null}
      </main>
    </>
  );
}
