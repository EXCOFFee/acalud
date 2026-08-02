# Seguridad y Testing

## Seguridad (NO NEGOCIABLE)
- **Autorización:** Por request y por propiedad (`WHERE por sujeto`). Recurso ajeno → 404. Ver tests `@seguridad`.
- **Secretos:** SOLO en variables de entorno. NUNCA en el repo. El scanner de CI bloquea.
- **Contraseñas:** `argon2id`.
- **Sesión:** OPACA con estado en servidor (tabla `sessions`). Token persiste hasheado, nunca en claro.
- **Cierre de sesión:** Elimina el registro. Comparaciones en tiempo constante.
- **Logs:** Sin PII (usar identificadores opacos).
- **Validación:** Zod en el borde de entrada. Prohibido `dangerouslySetInnerHTML`.

## Testing (ADR-002)
- **Idempotencia/unicidad:** Corren contra PostgreSQL REAL (Testcontainers). PROHIBIDO mockear la BD para esos tests.
- **Unitarios:** No mockear clases de dominio propias.
- **Criterio de finalización:** Un caso de uso no está "hecho" hasta que pasa su verificación.
- **Fuentes de verificación:** `docs/casos-de-uso/` (34 especificaciones) y `docs/03-requisitos/` (RF-CU<nn>-<nnn> / RNF-CU<nn>-<nnn>).