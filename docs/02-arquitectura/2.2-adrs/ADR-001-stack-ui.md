# ADR-001 · Stack de UI única: Next.js + Capacitor

| Campo | Valor |
|---|---|
| **Estado** | ✅ Aceptada (decisión del equipo, 2026-07-04) |
| **Decide** | Cómo una sola base de código produce la web y la APK (R-06 paridad total, R-07 sideload) |
| **Trazabilidad** | R-01, R-05, R-06, R-07, NFR-X1..X5, S-16 |

## Contexto

Paridad funcional total web/mobile con un solo desarrollador asistido por agente de IA,
presupuesto $0, entrega de APK por distribución directa. La aplicación es de datos y
formularios (catálogo, checkout, dashboards, carga de sesiones); no hay animación pesada ni
gráfica intensiva. Las demos de juegos son contenido web embebido (S-16).

## Decisión

**Next.js (React + TypeScript) como única base de UI**, compilada en modo estático
(`output: 'export'`): el mismo bundle se despliega como sitio web (Vercel) y se empaqueta
como **APK con Capacitor** mediante build local de Android Studio/Gradle (sin cuentas ni
servicios de build en la nube). Los datos se consumen client-side desde la API (ADR-002).
Las **versiones exactas se fijan al inicializar el repositorio (artefacto 5.1)** con las
últimas estables del momento, y quedan congeladas en el lockfile — un ADR no debe quedar
obsoleto por un número de versión.

## Justificación (fuentes verificadas 2026-07-04)

1. Ajuste al tipo de app: para una app CRUD con autenticación, listados, detalle y
   formularios, Capacitor es la vía más rápida porque reutiliza los componentes web y el
   código de API; es ideal para apps orientadas a datos B2C/B2B (The Debuggers 02-2026;
   Ionic Blog).
2. Paridad por construcción: la web *es* la app; R-06 deja de ser un esfuerzo y pasa a ser
   una propiedad estructural.
3. NFR-X3/X4 (Lighthouse, accesibilidad) son métricas web: Flutter Web tiene SEO pobre y no
   se considera listo para producción web en la mayoría de los casos (nextnative.dev).
4. Alineación con el agente: el tooling de IA es abrumadoramente web-first; llevar output
   React/HTML a widgets Flutter o primitivas RN es un "impuesto de traducción" que
   Capacitor evita (capgo.app 06-2026). Un solo lenguaje (TS) maximiza el ruteo
   Sonnet-por-defecto del plan 5.2.
5. Demos S-16: contenido HTML5 embebido reproduce nativamente en un WebView.

## Alternativas consideradas y descartadas

| Alternativa | Razón de descarte |
|---|---|
| **Flutter** | Techo de rendimiento superior que este dominio no necesita; exige Dart (segundo lenguaje en el repo, menor fluidez del agente); Flutter Web débil justo en la plataforma principal del proyecto (SEO/Lighthouse). |
| **React Native + Expo** | La web queda como ciudadana de segunda (react-native-web) — erosiona R-06; los builds de APK empujan al servicio en la nube de Expo (cuenta, colas, cuotas) mientras Capacitor buildea 100 % local. |
| **Dos frontends (web + nativo)** | Inviable con R-05 y R-08; duplica superficie de pruebas y mantenimiento. |

## Consecuencias

- ✅ Paridad garantizada; un solo pipeline de UI; APK firmada localmente sin dependencias externas.
- ✅ NFR-X5 (carga de sesión mobile-first) se resuelve con diseño responsive dedicado a esa pantalla.
- ⚠️ Limitación declarada: la app "se siente web" en el teléfono salvo inversión en patrones de UI mobile; techo de rendimiento WebView si algún día se agrega animación pesada (hoy no aplica).
- ⚠️ Static export ⇒ el contenido dinámico se hidrata client-side; aceptable para el alcance (no hay NFR de SEO). Válvula de escape documentada: mover la web a SSR en Vercel manteniendo la APK con Capacitor en modo remote-URL, sin reescritura.

## Registro de cambios
| Versión | Fecha | Cambio |
|---|---|---|
| 1.0.0 | 2026-07-04 | Decisión aceptada por el equipo |
