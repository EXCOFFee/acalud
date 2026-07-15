// Gate de CVE críticas (NFR-S3). Lee el JSON de osv-scanner y falla (exit 1) SOLO si hay
// alguna vulnerabilidad con severidad CRITICAL (CVSS base >= 9.0). Reemplaza a `pnpm audit`
// (endpoint de npm retirado, 410) manteniendo el gate duro. Uso: node gate-osv-critical.mjs osv.json
import { readFileSync } from 'node:fs';

const UMBRAL_CRITICO = 9.0;
const ruta = process.argv[2] ?? 'osv.json';

let data;
try {
  data = JSON.parse(readFileSync(ruta, 'utf8'));
} catch (e) {
  // Falla RUIDOSA: si el reporte no se puede leer, el scan no corrió bien → no pasar a ciegas.
  console.error(`❌ No se pudo leer el reporte de osv-scanner (${e.message}). El gate NO se evalúa a ciegas.`);
  process.exit(1);
}

const criticas = [];
for (const res of data.results ?? []) {
  for (const pkg of res.packages ?? []) {
    for (const grupo of pkg.groups ?? []) {
      const sev = Number.parseFloat(grupo.max_severity);
      if (!Number.isNaN(sev) && sev >= UMBRAL_CRITICO) {
        criticas.push({
          paquete: pkg.package?.name,
          version: pkg.package?.version,
          ids: grupo.ids,
          cvss: sev,
        });
      }
    }
  }
}

if (criticas.length > 0) {
  console.error(`❌ ${criticas.length} vulnerabilidad(es) CRÍTICA(s) (CVSS >= ${UMBRAL_CRITICO}):`);
  console.error(JSON.stringify(criticas, null, 2));
  process.exit(1);
}
console.log('✔ Sin CVE críticas (CVSS >= 9.0).');
