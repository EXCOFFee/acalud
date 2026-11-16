/**
 * Chequeo de DRIFT entre el contrato OpenAPI y las rutas reales de la API.
 *
 * Por qué existe: `redocly lint` solo valida que el YAML esté bien escrito, no que describa
 * la API real. Así el contrato v1 llegó a coincidir en 32 de 84 rutas sin que nada fallara.
 *
 * Cómo funciona: lee los decoradores `@Controller`/`@Get`/`@Post`/... de todos los
 * `*.controller.ts` de apps/api y los `paths` del contrato, normaliza los parámetros
 * (`:id` y `{id}` → `{}`) y compara los dos conjuntos.
 *
 * `PENDIENTES` fue un "trinquete" durante la reescritura (82 rutas, U1..U6): solo podía
 * achicarse. Quedó VACÍA (2026-11): desde ahora, un endpoint nuevo sin su entrada en el
 * contrato rompe el CI. No agregues rutas acá para "destrabar" un build: documentalas.
 *
 * Limitación conocida (parser deliberadamente simple, sin dependencia de YAML): asume que
 * los paths están a 2 espacios de indentación y los métodos a 4, como en el contrato.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = join(__dirname, '..', '..', '..');
const DIR_API = join(RAIZ, 'apps', 'api', 'src');
const CONTRATO = join(RAIZ, 'docs', '06-contratos', 'openapi.yaml');

const PENDIENTES: readonly string[] = [];

function normalizar(ruta: string): string {
  return (
    ('/' + ruta)
      .replace(/\/+/g, '/')
      .replace(/\/$/, '')
      .replace(/:[A-Za-z_]+/g, '{}')
      .replace(/\{[^}]*\}/g, '{}') || '/'
  );
}

function controllers(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return controllers(p);
    return e.name.endsWith('.controller.ts') ? [p] : [];
  });
}

function rutasDelCodigo(): Set<string> {
  const rutas = new Set<string>();
  for (const archivo of controllers(DIR_API)) {
    let prefijo = '';
    for (const linea of readFileSync(archivo, 'utf8').split('\n')) {
      const c = linea.match(/@Controller\(\s*['"`]?([^'"`)]*)/);
      if (c) prefijo = c[1] ?? '';
      const m = linea.match(/@(Get|Post|Put|Patch|Delete)\(\s*(?:['"`]([^'"`]*)['"`])?/);
      if (m) rutas.add(`${m[1]!.toUpperCase()} ${normalizar(`${prefijo}/${m[2] ?? ''}`)}`);
    }
  }
  return rutas;
}

function rutasDelContrato(): Set<string> {
  const rutas = new Set<string>();
  let actual: string | null = null;
  for (const linea of readFileSync(CONTRATO, 'utf8').split('\n')) {
    const p = linea.match(/^ {2}(\/[^:\s]*):\s*$/);
    if (p) {
      actual = p[1] ?? null;
      continue;
    }
    if (/^\S/.test(linea)) actual = null; // salimos de `paths:`
    const m = linea.match(/^ {4}(get|post|put|patch|delete):/);
    if (m && actual) rutas.add(`${m[1]!.toUpperCase()} ${normalizar(actual)}`);
  }
  return rutas;
}

describe('drift contrato OpenAPI ↔ controllers de apps/api', () => {
  const codigo = rutasDelCodigo();
  const contrato = rutasDelContrato();
  const pendientes = new Set(PENDIENTES);

  it('detecta rutas en ambos lados (sanity check del parser)', () => {
    expect(codigo.size).toBeGreaterThan(50);
    expect(contrato.size).toBeGreaterThan(0);
  });

  it('toda ruta del código está en el contrato (o en PENDIENTES)', () => {
    const faltan = [...codigo].filter((r) => !contrato.has(r) && !pendientes.has(r)).sort();
    expect(faltan, 'Rutas sin documentar: agregalas a docs/06-contratos/openapi.yaml').toEqual([]);
  });

  it('el contrato no describe rutas que no existen', () => {
    const fantasmas = [...contrato].filter((r) => !codigo.has(r)).sort();
    expect(fantasmas, 'Rutas del contrato que no existen en el código').toEqual([]);
  });

  it('PENDIENTES solo se achica (trinquete)', () => {
    const yaDocumentadas = PENDIENTES.filter((r) => contrato.has(r));
    const inexistentes = PENDIENTES.filter((r) => !codigo.has(r));
    expect(yaDocumentadas, 'Ya están en el contrato: sacalas de PENDIENTES').toEqual([]);
    expect(inexistentes, 'Ya no existen en el código: sacalas de PENDIENTES').toEqual([]);
  });
});
