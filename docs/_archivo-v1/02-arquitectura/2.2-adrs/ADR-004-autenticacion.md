# ADR-004 · Autenticación propia: session store único, transporte dual

| Campo | Valor |
|---|---|
| **Estado** | ✅ Aceptada (decisión del equipo, 2026-07-04) |
| **Decide** | Mecanismo de autenticación/sesiones para web y APK |
| **Trazabilidad** | 1.1-A completo (PA-01..06, S-06), NFR-S1, ASVS §V2/V3 |

## Contexto

El equipo eligió autenticación **propia** (máximo material ASVS para la tesis, control total
de PA-01..06). Los CU de 1.1-A ya especifican el comportamiento; este ADR fija el mecanismo.
**Trampa detectada en diseño (y motivo central de este ADR):** la APK Capacitor sirve la UI
desde un origen local (`https://localhost` del WebView) contra la API en otro dominio — una
cookie `httpOnly` de sesión ahí es una *third-party cookie*, territorio hostil y frágil.
Resolver esto después del código sería una reescritura del módulo más sensible.

## Decisión

1. **Session store server-side único** (tabla `sesiones`: hash del token opaco, cuenta,
   expiración deslizante PA-05, metadata de auditoría). Toda revocación (logout CU-003,
   cambio de contraseña CU-004 A2, reset CU-E01) opera sobre esta tabla y **afecta a todos
   los canales a la vez**.
2. **Transporte dual sobre el mismo store:**
   - **Web:** cookie `httpOnly; Secure; SameSite=Lax`. El frontend y la API comparten sitio
     mediante **rewrites de Vercel** (`/api/* → Render`), eliminando el problema
     cross-origin y el preflight CORS con credenciales.
   - **APK:** el mismo endpoint de login devuelve el token opaco en el cuerpo; la app lo
     guarda en almacenamiento seguro de Capacitor y lo envía como `Authorization: Bearer`.
3. **Contraseñas:** argon2id (parámetros de la librería oficial mantenida del ecosistema),
   verificación contra lista de contraseñas filtradas (PA-01), comparaciones en tiempo
   constante (directivas de 1.1-A).
4. **MFA TOTP obligatorio para Admin** (S-06): enrolamiento con QR, ventana ±1 paso,
   códigos de respaldo de un solo uso hasheados. Sin SMS (costo y SIM-swap).
5. **Tokens de verificación/recuperación:** opacos, hasheados en BD, un solo uso, vigencias
   PA-03/PA-04 (ya especificado en 1.1-A; este ADR solo lo ancla al mecanismo).

## Alternativas consideradas y descartadas

| Alternativa | Razón de descarte |
|---|---|
| **JWT stateless como sesión primaria** | PA-05 y CU-004 A2 exigen revocación inmediata ("invalida todas las demás sesiones"); un JWT puro no se revoca sin blocklist consultada en cada request — es decir, un session store con pasos extra y una ventana de validez zombi. Se pierde la simpleza que lo justificaba. |
| **Supabase Auth** | Decisión explícita del equipo por la variante propia: control fino de PA-01/02/06 y valor académico de implementar y amenazar el módulo (Bloque 3). Queda como plan B documentado si el tiempo aprieta (los puertos no cambian). |
| **Cookie también en la APK** | Third-party cookie en WebView: comportamiento frágil y dependiente de versión del sistema; descartado por diseño. |

## Consecuencias

- ✅ Revocación real multi-canal con una sola fuente de verdad; el mismo middleware de
  autenticación resuelve cookie o Bearer y el resto del backend no distingue canales.
- ✅ ASVS §V2/V3: los controles quedan implementados en código propio y testeados por los
  escenarios `@seguridad` de 1.1 — material directo para 3.3.
- ⚠️ Costo: más código propio que una solución delegada; mitigado porque 1.1-A ya lo
  especifica al nivel de test y el módulo está pre-asignado a modelo alto en 5.2.
- ⚠️ El rewrite de Vercel se vuelve pieza de infraestructura crítica (si se rompe, la web
  pierde sesión): se prueba en el esqueleto E2E (primera etapa del plan).

## Registro de cambios
| Versión | Fecha | Cambio |
|---|---|---|
| 1.0.0 | 2026-07-04 | Decisión aceptada |
