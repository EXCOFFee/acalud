Plan Secuencial Propuesto

1.Auditoría detallada por módulo (Auth, Perfil, Aulas, Actividades, Biblioteca, Gamificación, Moderación) documentando brechas y dependencias; consolidar matriz HU↔CU↔RF↔tests en nuevo documento maestro.

2.Refactor inicial aplicando SOLID/DRY/KISS: extraer policies de permisos, normalizar helpers de navegación/validación y añadir comentarios breves en español en lógica compleja.

3.Endurecer autenticación y perfil: completar validación institucional, flujo de recuperación, auditoría/logging, pruebas unitarias/E2E; reforzar DTOs y formularios.

4.Completar gestión de aulas/actividades (invitar/abandonar, publicar/ocultar, historial, biblioteca copiar/puntuar) con validaciones, servicios y pruebas.

5.Implementar módulos pendientes (gamificación completa, moderación operativa, monetización configurable) y cubrir RNF críticos (seguridad, rendimiento, backups, compatibilidad).

6.Integrar observabilidad/logging estructurado y documentación centralizada (README maestro + guía DR + matriz compatibilidad).