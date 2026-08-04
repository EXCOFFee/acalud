'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Boton, Dialogo, IconoCerrar, IconoMenu, IconoAtras } from '@/components/ui';
import { api } from '@/lib/api';

const LINKS = [
  { href: '/catalogo', etiqueta: 'Catálogo' },
  { href: '/editoriales', etiqueta: 'Editoriales' },
  { href: '/encuestas', etiqueta: 'Encuestas' },
  { href: '/propuestas', etiqueta: 'Proponer un juego' },
  { href: '/carrito', etiqueta: 'Carrito' },
];

/**
 * Barra superior de toda la app (páginas públicas y autenticadas). Sabe si hay sesión iniciada
 * (CU-002/CU-004 vía `GET /me`) para mostrar "Cerrar sesión" en vez de "Ingresar" — CU-003
 * RN-001: el logout tiene que poder hacerse desde cualquier página donde el usuario esté logueado.
 */
export function SiteNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [logueado, setLogueado] = useState<boolean | null>(null); // null = todavía no se sabe
  const [confirmando, setConfirmando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [movilAbierto, setMovilAbierto] = useState(false);

  useEffect(() => {
    let vivo = true;
    api
      .me()
      .then(() => vivo && setLogueado(true))
      .catch(() => vivo && setLogueado(false));
    return () => {
      vivo = false;
    };
  }, []);

  // El menú mobile se cierra al navegar — evita quedar abierto tapando la página siguiente.
  useEffect(() => {
    setMovilAbierto(false);
  }, [pathname]);

  async function confirmarSalida(): Promise<void> {
    setSaliendo(true);
    try {
      await api.logout(); // A2/A4: si el backend falla, igual se completa el logout local
    } finally {
      setConfirmando(false);
      setSaliendo(false);
      router.push('/'); // RN-006: siempre a home, nunca deja al usuario en una página autenticada
    }
  }

  const accionSesion = logueado ? (
    <>
      <Link className="boton boton--fantasma" href="/cuenta">
        Mi cuenta
      </Link>
      <Boton variante="primario" onClick={() => setConfirmando(true)}>
        Cerrar sesión
      </Boton>
    </>
  ) : logueado === false ? (
    <Boton variante="primario" href="/login">
      Ingresar
    </Boton>
  ) : null;

  return (
    <>
      <header className="nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--tinta-suave)',
              padding: '0.2rem',
            }}
            aria-label="Volver"
          >
            <IconoAtras size={22} />
          </button>
          <Link className="marca" href="/" style={{ textDecoration: 'none' }}>
            <span className="marca__ficha" aria-hidden="true" />
            Acalud
          </Link>
        </div>

        <nav className="nav__acciones" aria-label="Principal">
          {LINKS.map((l) => (
            <Link key={l.href} className="boton boton--fantasma" href={l.href}>
              {l.etiqueta}
            </Link>
          ))}
          {accionSesion}
        </nav>

        <button
          type="button"
          className="nav__hamburguesa"
          aria-expanded={movilAbierto}
          aria-controls="nav-movil"
          aria-label={movilAbierto ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setMovilAbierto((v) => !v)}
        >
          {movilAbierto ? <IconoCerrar /> : <IconoMenu />}
        </button>
      </header>

      {movilAbierto ? (
        <nav id="nav-movil" className="nav__movil" aria-label="Principal (mobile)">
          {LINKS.map((l) => (
            <Link key={l.href} className="nav__movil-link" href={l.href}>
              {l.etiqueta}
            </Link>
          ))}
          <div className="nav__movil-sesion">{accionSesion}</div>
        </nav>
      ) : null}

      <Dialogo
        abierto={confirmando}
        onCerrar={() => setConfirmando(false)}
        titulo="¿Cerrar sesión?"
        acciones={
          <>
            <Boton variante="fantasma" onClick={() => setConfirmando(false)} disabled={saliendo}>
              No, cancelar
            </Boton>
            <Boton variante="peligro" onClick={confirmarSalida} cargando={saliendo}>
              Sí, cerrar sesión
            </Boton>
          </>
        }
      >
        <p>Vas a salir de tu cuenta en este dispositivo.</p>
      </Dialogo>
    </>
  );
}

/** Precio en pesos argentinos, sin centavos. */
export function precioARS(valor: number): string {
  return valor.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });
}
