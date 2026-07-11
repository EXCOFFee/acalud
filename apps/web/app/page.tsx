import Link from 'next/link';

export default function Home() {
  return (
    <>
      <header className="nav">
        <span className="marca">
          <span className="marca__ficha" aria-hidden="true" />
          Acalud
        </span>
        <div className="nav__acciones">
          <Link className="boton boton--fantasma" href="/login">
            Ingresar
          </Link>
          <Link className="boton boton--primario" href="/registro">
            Crear cuenta
          </Link>
        </div>
      </header>

      <main className="contenedor" style={{ paddingTop: 'clamp(3rem, 10vh, 7rem)' }}>
        <p className="eyebrow">Juegos educativos · Docentes e instituciones</p>
        <h1 style={{ fontSize: 'clamp(2.4rem, 7vw, 4rem)', maxWidth: '16ch', margin: '0.4rem 0' }}>
          Del tablero al aula, con datos.
        </h1>
        <p style={{ fontSize: '1.15rem', color: 'var(--tinta-suave)', maxWidth: '52ch' }}>
          Comprá juegos, sumate a la comunidad docente y medí el uso real de cada juego en clase.
          Todo en un lugar.
        </p>
        <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1.8rem', flexWrap: 'wrap' }}>
          <Link className="boton boton--primario" href="/registro">
            Crear cuenta
          </Link>
          <Link className="boton boton--fantasma" href="/login">
            Ya tengo cuenta
          </Link>
        </div>
      </main>
    </>
  );
}
