'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alerta, EstadoCarga } from '@/components/ui';
import { SiteNav } from '@/components/site-nav';
import { api, ApiError, type EstadoPedido } from '@/lib/api';

// RNF-005 (CU-12): polling cada 3s, hasta ~2 minutos antes de rendirse.
const INTERVALO_MS = 3000;
const MAX_INTENTOS = 40;

type Vista = 'esperando' | 'paid' | 'under_review' | 'agotado';

export default function ResultadoCheckoutPage() {
  const router = useRouter();
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [mpStatus, setMpStatus] = useState<string | null>(null);
  const [estadoPedido, setEstadoPedido] = useState<EstadoPedido | null>(null);
  const [vista, setVista] = useState<Vista>('esperando');
  const [error, setError] = useState<string | null>(null);
  const intentos = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('pedido_id');
    setMpStatus(params.get('status'));
    if (!id) {
      setError('No encontramos el pedido a confirmar.');
      return;
    }
    setPedidoId(id);
  }, []);

  useEffect(() => {
    if (!pedidoId) return;
    let vigente = true;

    async function consultar(): Promise<void> {
      try {
        const pedido = await api.verPedido(pedidoId!);
        if (!vigente) return;
        setEstadoPedido(pedido.estado);
        if (pedido.estado === 'paid') {
          setVista('paid');
          return;
        }
        if (pedido.estado === 'under_review') {
          setVista('under_review');
          return;
        }
        intentos.current += 1;
        if (intentos.current >= MAX_INTENTOS) {
          setVista('agotado');
          return;
        }
        setTimeout(consultar, INTERVALO_MS);
      } catch (err) {
        if (!vigente) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?volver=/checkout/resultado?pedido_id=${pedidoId}`);
          return;
        }
        setError('No pudimos consultar el estado de tu pedido. Revisá "Mis pedidos".');
      }
    }

    void consultar();
    return () => {
      vigente = false;
    };
  }, [pedidoId]);

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem', maxWidth: '640px' }}>
        <p className="eyebrow">Checkout</p>
        <h1 style={{ fontSize: 'clamp(1.7rem, 5vw, 2.4rem)', margin: '0.3rem 0 0.8rem' }}>
          {vista === 'paid' ? '¡Compra confirmada! 🎲' : 'Confirmando tu pago'}
        </h1>

        {error ? <Alerta tipo="error">{error}</Alerta> : null}

        {!error && vista === 'esperando' ? (
          <>
            <EstadoCarga>Estamos confirmando tu pago con Mercado Pago…</EstadoCarga>
            <p style={{ color: 'var(--tinta-suave)' }}>
              Esto puede tardar unos segundos. No cierres ni recargues esta página.
            </p>
          </>
        ) : null}

        {vista === 'paid' ? (
          <Alerta tipo="ok">
            Tu pago se acreditó y tu pedido quedó pagado. Te enviamos la confirmación por email.
          </Alerta>
        ) : null}

        {vista === 'under_review' ? (
          <Alerta tipo="aviso">
            Tu pedido quedó en revisión (verificamos el monto o el stock). Te contactaremos apenas se resuelva.
          </Alerta>
        ) : null}

        {vista === 'agotado' ? (
          <Alerta tipo={mpStatus === 'rejected' ? 'error' : 'aviso'}>
            {mpStatus === 'rejected'
              ? 'Mercado Pago rechazó el pago. Tu carrito se conservó: podés reintentar desde "Mis pedidos".'
              : 'Todavía no confirmamos tu pago. Revisá el estado más tarde en "Mis pedidos" — no hace falta que vuelvas a pagar si ya lo hiciste.'}
          </Alerta>
        ) : null}

        {estadoPedido && vista !== 'esperando' ? (
          <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1.2rem', flexWrap: 'wrap' }}>
            <Link className="boton boton--primario" href="/cuenta/pedidos">
              Ver mis pedidos
            </Link>
            <Link className="boton boton--fantasma" href="/catalogo">
              Seguir comprando
            </Link>
          </div>
        ) : null}
      </main>
    </>
  );
}
