const PASOS = [
  {
    titulo: 'Elegís el juego',
    texto: 'Explorás el catálogo y sumás el que tu grupo necesita, propio o de una editorial aliada.',
  },
  {
    titulo: 'Lo llevás al aula',
    texto: 'Docentes e instituciones lo asignan y lo juegan en clase, con o sin sesión.',
  },
  {
    titulo: 'Medís lo que aprendieron',
    texto: 'Cargás cada sesión jugada y el sistema arma el reporte pedagógico solo.',
  },
];

/**
 * Firma visual de la home: la marca es "juegos de mesa que se miden en el aula" — en vez de un
 * hero genérico (eyebrow + título + botones), el camino real que recorre un usuario se dibuja
 * como una pista de tablero de 3 casilleros con una ficha avanzando. Es una secuencia real
 * (comprar → jugar → medir), por eso se justifica numerar los pasos.
 */
export function PistaTablero() {
  return (
    <div className="pista">
      <div className="pista__via" aria-hidden="true">
        <span className="pista__ficha" />
      </div>
      <ol className="pista__pasos">
        {PASOS.map((paso, i) => (
          <li key={paso.titulo} className="pista__paso">
            <span className="pista__numero">{i + 1}</span>
            <h3 className="pista__titulo">{paso.titulo}</h3>
            <p className="pista__texto">{paso.texto}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
