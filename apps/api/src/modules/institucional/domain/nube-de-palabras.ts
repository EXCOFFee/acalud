import type { PalabraFrecuente } from './ports/sesiones.repository';

/**
 * CU-31 RN-006: "nube de palabras... aprendizajes clave más mencionados (frecuencia)". No hay
 * un campo estructurado de tags, `key_learnings` es texto libre (CU-29) — se tokeniza y cuenta
 * frecuencia de términos, filtrando conectores sin valor informativo. Alcanza sin librería de
 * NLP: el dataset ya está acotado por PI-04 (tope 5000 filas de exportación).
 */
const STOPWORDS = new Set([
  'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para',
  'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o', 'este',
  'sí', 'porque', 'esta', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'también', 'me', 'hasta',
  'hay', 'donde', 'quien', 'desde', 'todo', 'nos', 'durante', 'todos', 'uno', 'les', 'ni',
  'contra', 'otros', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto', 'mí', 'antes', 'algunos',
  'qué', 'unos', 'yo', 'otro', 'otras', 'otra', 'él', 'tanto', 'esa', 'estos', 'mucho',
  'quienes', 'nada', 'muchos', 'cual', 'poco', 'ella', 'estar', 'estas', 'algunas', 'algo',
  'nosotros', 'mi', 'mis', 'tú', 'te', 'ti', 'tu', 'tus', 'ellas', 'nosotras', 'vosotros',
  'vosotras', 'os', 'mío', 'mía', 'míos', 'mías', 'tuyo', 'tuya', 'tuyos', 'tuyas', 'suyo',
  'suya', 'suyos', 'suyas', 'fue', 'ser', 'son', 'era', 'están', 'está', 'fueron', 'han', 'ha',
  'tienen', 'tiene', 'grupo', 'clase', 'juego', 'alumnos', 'alumnas', 'estudiantes',
]);

const MIN_LARGO = 3;

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, ''); // NFD separa la letra de su tilde; esto descarta la marca
}

/** Tokeniza una lista de textos libres y devuelve las `limite` palabras más frecuentes. */
export function tokenizarAprendizajes(textos: string[], limite: number): PalabraFrecuente[] {
  const frecuencias = new Map<string, number>();

  for (const texto of textos) {
    const palabras = normalizar(texto)
      .replace(/[^a-z0-9\sñ]/g, ' ')
      .split(/\s+/)
      .filter((p) => p.length >= MIN_LARGO && !STOPWORDS.has(p));

    for (const palabra of palabras) {
      frecuencias.set(palabra, (frecuencias.get(palabra) ?? 0) + 1);
    }
  }

  return [...frecuencias.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limite)
    .map(([palabra, frecuencia]) => ({ palabra, frecuencia }));
}
