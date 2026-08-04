import Link from 'next/link';
import { PistaTablero } from '@/components/pista-tablero';

export default function Home() {
  return (
    <>
      <header className="nav">
        <span className="marca">
          <span className="marca__ficha" aria-hidden="true" />
          Acalud
        </span>
        <div className="nav__acciones">
          <Link className="boton boton--fantasma" href="/catalogo">
            Catálogo
          </Link>
          <Link className="boton boton--fantasma" href="/login">
            Ingresar
          </Link>
          <Link className="boton boton--primario" href="/registro">
            Crear cuenta
          </Link>
        </div>
      </header>

      <main className="contenedor" style={{ maxWidth: '58rem', paddingTop: 'clamp(2.5rem, 8vh, 5.5rem)' }}>
        <h1 style={{ fontSize: 'clamp(2.3rem, 6vw, 3.6rem)', maxWidth: '17ch' }}>
          Del tablero al aula, con datos.
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--tinta-suave)', maxWidth: '48ch', marginTop: '0.9rem' }}>
          Comprá juegos de mesa educativos, sumate a la comunidad docente y medí el uso real de
          cada juego en clase.
        </p>
        <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1.6rem', flexWrap: 'wrap' }}>
          <Link className="boton boton--primario" href="/catalogo">
            Ver catálogo
          </Link>
          <Link className="boton boton--fantasma" href="/registro">
            Crear cuenta
          </Link>
        </div>

        <PistaTablero />
      </main>
    </>
  );
}
