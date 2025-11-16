# Plan de Validación de Requerimientos No Funcionales - 01/11/2025

## Objetivo
Establecer los pasos necesarios para verificar los RNF identificados en el proyecto AcaLud (performance, seguridad, compatibilidad, mantenibilidad y disponibilidad).

## Estrategia por Categoría

### Usabilidad (RNF001-RNF004)
- **Acciones**:
  - Ejecutar pruebas de usabilidad con escenarios guiados (docente y estudiante) y medir número de clics/tiempos.
  - Validar responsividad en 320px, 768px, 1024px, 1440px.
  - Documentar feedback de usuarios o testers internos.
- **Herramientas**: Lighthouse, Browser DevTools, encuestas internas.

### Rendimiento (RNF005-RNF007)
- **Acciones**:
  - Configurar pruebas de carga con k6/Artillery apuntando a endpoints críticos (auth, classrooms, activities, store).
  - Ejecutar benchmarks en ambientes controlados mediendo latencia, throughput y uso de recursos.
  - Revisar tamaño de base de datos estimando capacidad para 50k usuarios.
- **Herramientas**: k6, Docker Compose (stress), PostgreSQL EXPLAIN.

### Seguridad (RNF008-RNF011)
- **Acciones**:
  - Revisar políticas de hashing y almacenamiento de contraseñas.
  - Configurar escáneres (npm audit, Snyk) y pruebas OWASP ZAP para endpoints.
  - Verificar configuración HTTPS y encriptación en reposo (a nivel infraestructura).
- **Herramientas**: OWASP ZAP, npm audit, revisión de middleware NestJS.

### Fiabilidad (RNF012-RNF014)
- **Acciones**:
  - Revisar monitoreo y alertas (logs, health checks).
  - Validar plan de backups (scripts, cron) y restauración.
  - Simular fallos controlados para medir tiempo de recuperación.
- **Herramientas**: Scripts de backup, Docker, documentación DevOps.

### Compatibilidad (RNF015-RNF017)
- **Acciones**:
  - Probar frontend en Chrome, Firefox, Edge, Safari (últimas 2 versiones).
  - Validar app en dispositivos Android modernos (emulador + dispositivo físico si es posible).
- **Herramientas**: BrowserStack, emuladores Android.

### Mantenibilidad y Escalabilidad (RNF018-RNF022)
- **Acciones**:
  - Revisar documentación técnica para asegurar actualización (docs/).
  - Ejecutar linters (`npm run lint` front/back), medir deuda técnica.
  - Evaluar arquitectura para escalado horizontal (revisión de docker-compose, configuración de base de datos, caching).
  - Documentar API REST (OpenAPI) y revisar versionado.

## Entregables Esperados
1. Reporte de pruebas de carga con métricas clave y conclusiones.
2. Registro de hallazgos de seguridad con plan de mitigación.
3. Checklist de compatibilidad con resultados por navegador/dispositivo.
4. Actualización de documentación de operaciones (backups, DRP).

## Próximos Pasos
- Asignar responsables por categoría.
- Definir ambiente de pruebas (infraestructura disponible, datos ficticios).
- Calendarizar ejecución y recopilar evidencias.
