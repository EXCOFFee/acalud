// Seed de catálogo con datos PLAUSIBLES y FICTICIOS (patrón del proyecto: plausible/ficticio).
// Idempotente (ON CONFLICT DO NOTHING con UUIDs fijos). Uso:  node apps/api/scripts/seed-catalogo.mjs
// Lee DATABASE_URL de .env o del entorno. Pensado para poblar la demo; los datos reales se
// cargarán con el ABM de administración (Etapa 2).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../package.json', import.meta.url));
const { Pool } = require('pg');

function env() {
  try {
    const raw = readFileSync(new URL('../../../.env', import.meta.url), 'utf8');
    const e = Object.fromEntries(
      raw.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && l.includes('='))
        .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
    );
    return { ...e, ...process.env };
  } catch {
    return process.env;
  }
}

const e = env();
const conn = e.DATABASE_URL;
const ssl = /localhost|127\.0\.0\.1/.test(conn ?? '') ? false : { rejectUnauthorized: false };

// id, nombre, area, edad, precio, peso_g, stock, descripcion
const JUEGOS = [
  ['11111111-1111-4111-8111-111111111111', 'Fracciones en Acción', 'Matemática', '8 a 12 años', 12500, 800, 40,
    'Un juego de mesa cooperativo para dominar fracciones equivalentes, sumas y comparaciones jugando a repartir una pizzería. Incluye 60 cartas, tablero y fichas manipulables.'],
  ['22222222-2222-4222-8222-222222222222', 'La Isla de las Palabras', 'Lengua', '6 a 9 años', 9800, 650, 25,
    'Aventura de alfabetización: los jugadores forman palabras, reconocen sílabas y construyen oraciones para cruzar la isla. Ideal para primer ciclo.'],
  ['33333333-3333-4333-8333-333333333333', 'Ecosistemas', 'Ciencias Naturales', '9 a 13 años', 14200, 950, 30,
    'Simulá cadenas alimentarias y el equilibrio de un ecosistema. Cada decisión afecta a las poblaciones: enseña interdependencia y biodiversidad.'],
  ['44444444-4444-4444-8444-444444444444', 'Línea del Tiempo Argentina', 'Ciencias Sociales', '10 a 14 años', 11500, 700, 20,
    'Ordená hechos clave de la historia argentina en la línea del tiempo. Fomenta el pensamiento cronológico y el debate histórico.'],
  ['55555555-5555-4555-8555-555555555555', 'Geometría Aventura', 'Matemática', '7 a 11 años', 10900, 720, 50,
    'Reconocé figuras, ángulos y simetrías resolviendo desafíos de construcción con piezas geométricas. Con niveles de dificultad progresivos.'],
  ['66666666-6666-4666-8666-666666666666', 'Código Verde', 'Programación', '8 a 12 años', 15800, 500, 0,
    'Programación desconectada (sin pantallas): los jugadores escriben secuencias de instrucciones para guiar a un robot por el tablero. Introduce lógica y algoritmos.'],
  ['77777777-7777-4777-8777-777777777777', 'Átomos y Moléculas', 'Ciencias Naturales', '11 a 15 años', 13400, 680, 18,
    'Combiná elementos para formar moléculas y descubrí reacciones. Un puente lúdico hacia la química del secundario.'],
];

// juego_id, cantidad_minima, descuento_pct
const TRAMOS = [
  ['11111111-1111-4111-8111-111111111111', 5, 10],
  ['11111111-1111-4111-8111-111111111111', 10, 18],
  ['55555555-5555-4555-8555-555555555555', 5, 12],
  ['33333333-3333-4333-8333-333333333333', 8, 15],
];

// juego_id, tipo, formato, contenido_ref
const DEMOS = [
  ['22222222-2222-4222-8222-222222222222', 'publica', 'html5', 'demos/isla-palabras'],
  ['55555555-5555-4555-8555-555555555555', 'publica', 'video', 'demos/geometria-aventura'],
];

const pool = new Pool({ connectionString: conn, ssl });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  for (const [id, nombre, area, edad, precio, peso, stock, desc] of JUEGOS) {
    await client.query(
      `INSERT INTO juegos (id, nombre, area, edad_objetivo, precio_lista, peso_gramos, stock_actual, descripcion, publicado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true) ON CONFLICT (id) DO NOTHING`,
      [id, nombre, area, edad, precio, peso, stock, desc],
    );
  }
  for (const [jid, cant, pct] of TRAMOS) {
    await client.query(
      `INSERT INTO tramos_descuento (juego_id, cantidad_minima, descuento_pct)
       VALUES ($1,$2,$3) ON CONFLICT (juego_id, cantidad_minima) DO NOTHING`,
      [jid, cant, pct],
    );
  }
  for (const [jid, tipo, formato, ref] of DEMOS) {
    await client.query(
      `INSERT INTO demos (juego_id, tipo, formato, contenido_ref)
       VALUES ($1,$2,$3,$4) ON CONFLICT (juego_id, tipo) DO NOTHING`,
      [jid, tipo, formato, ref],
    );
  }
  await client.query('COMMIT');
  const n = await client.query('SELECT count(*)::int AS n FROM juegos WHERE publicado = true');
  console.log(`Seed OK · juegos publicados: ${n.rows[0].n}`);
} catch (err) {
  await client.query('ROLLBACK');
  console.error('Seed ERROR:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
