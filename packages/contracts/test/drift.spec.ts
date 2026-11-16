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
 * `PENDIENTES` es un "trinquete": rutas que existen en el código y todavía no se documentaron.
 * Solo puede achicarse: si documentás una, el test exige que la saques de la lista. Cuando
 * quede vacía, cualquier endpoint nuevo sin contrato rompe el CI.
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

const PENDIENTES: readonly string[] = [
  // U5 · institucional (instituciones, docentes)
  'GET /instituciones/mine',
  'POST /instituciones',
  'GET /instituciones/{}/inventario',
  'GET /instituciones/{}/inventario/{}',
  'POST /instituciones/{}/asignaciones',
  'POST /instituciones/{}/revocaciones',
  'GET /instituciones/{}/docentes/asignaciones',
  'GET /instituciones/{}/docentes/asignaciones/{}',
  'GET /instituciones/{}/reportes/uso',
  'GET /instituciones/{}/reportes/uso/producto/{}',
  'GET /instituciones/{}/reportes/uso/docente/{}',
  'GET /instituciones/{}/reportes/uso/exportar',
  'GET /instituciones/{}/dashboard',
  'GET /instituciones/{}/dashboard/exportar',
  'GET /docentes/me/asignaciones',
  'POST /docentes/me/sesiones-juego',
  'GET /docentes/me/sesiones-juego',
  'GET /docentes/me/sesiones-juego/{}',
  // U6 · comunidad (encuestas, propuestas, niveles/materias + sus admin)
  'GET /levels',
  'GET /subjects',
  'GET /polls',
  'GET /polls/{}/results',
  'POST /polls/{}/responses',
  'GET /proposals',
  'POST /proposals',
  'GET /admin/polls',
  'GET /admin/polls/{}',
  'POST /admin/polls',
  'PUT /admin/polls/{}',
  'PATCH /admin/polls/{}/toggle',
  'DELETE /admin/polls/{}',
  'GET /admin/proposals',
  'GET /admin/proposals/{}',
  'PUT /admin/proposals/{}',
];

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
