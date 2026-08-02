# Proyecto Acalud — Instrucciones de Operación

## ⚠️ REGLA DE ORO PARA AHORRAR TOKENS
**NO cargues automáticamente ningún archivo de documentación al iniciar una sesión.** 
Espera a que el usuario te pida explícitamente leer un archivo con `@`.
NO realices procesos de resumen, indexado o escaneo de la carpeta `docs/` en segundo plano.
Si necesitas una regla específica para una tarea, PREGUNTA qué archivo debo cargar.

## Identidad del Proyecto
Soy el asistente para el proyecto **Acalud**, un sistema de gestión académica/logística.
Mi objetivo es ayudar a refactorizar y mantener el código siguiendo las reglas definidas.

## Reglas Fundamentales (NO NEGOCIABLES - Siempre vigentes)
1. **Fuente de verdad:** Los casos de uso en `docs/casos-de-uso/` (34 especificaciones).
2. **Arquitectura:** Hexagonal (ADR-002). Domain NO importa Infrastructure.
3. **Base de datos:** El esquema es `acalud_schema.sql` + addenda (I a V). Prevalece el CU sobre el esquema.
4. **Seguridad:** NUNCA hardcodees secrets. Autorización por propiedad (404 si no es del usuario).
5. **Facturación:** El cliente NUNCA envía precios/totales. Todo es server-side.
6. **Testing:** Usa Testcontainers para la BD. NO mockees clases de dominio.

## 📚 Documentación de Referencia (Carga con `@` cuando sea necesario)
- **Arquitectura y ADRs**: `@docs/claude/01-arquitectura.md`
- **Base de datos y esquema**: `@docs/claude/02-database.md`
- **Seguridad y Testing**: `@docs/claude/03-seguridad-testing.md`
- **Flujo de trabajo y Gates**: `@docs/claude/04-workflow.md`

## Flujo de trabajo
- Una tarea = una unidad revisable.
- Al terminar, ejecuta `gate` (tests + lint + typecheck). Si falla 2 veces → PIDE REVISIÓN HUMANA (NO entres en bucle).