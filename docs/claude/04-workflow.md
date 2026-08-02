# Estilo y Flujo de Trabajo

## Estilo de código
- **Nomenclatura en INGLÉS:** Tablas, columnas, rutas, contratos, clases de dominio, tipos, enumeraciones.
- **Puede quedar en español:** Variables locales, métodos privados, comentarios, mensajes al usuario, nombres de archivos de test.
- **Errores:** Formato RFC 9457 Problem Details con `trace_id`.

## Flujo de trabajo
- **PENDIENTE:** El plan de tareas del refactor se define en la Fase 2 (mapeo español→inglés + plan por capas). Hasta entonces, trabajá por la unidad acordada con el usuario.
- **Regla:** Una tarea = una unidad revisable.
- **Gate:** Al terminar una tarea, ejecutá `tests + lint + typecheck` ANTES de continuar.
- **Loop de errores:** Si un gate falla dos veces con el mismo enfoque → PARÁ y pedí revisión humana. NO entres en bucle.