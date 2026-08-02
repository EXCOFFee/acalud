# Desarrollo de CU-05: Ver Historial de Compras

## Resumen del Trabajo
Se ha implementado el caso de uso **CU-05 "Ver Historial de Compras"**, el cual permite a un docente ver la lista paginada de sus pedidos con capacidad de filtrado y ordenamiento, y también ver el detalle específico de un pedido.

## Tareas Completadas

### 1. Definición de Puertos y Estructuras (Dominio)
- **Ruta**: `apps/api/src/modules/compras/domain/ports/historial.repository.ts`
- Se crearon las interfaces necesarias: `FiltroHistorial`, `OrdenHistorial`, `DetalleOrdenHistorial` y `ResultadoPaginado`.
- Se definió el puerto `HistorialRepository` con los métodos `listar` y `detalle`.

### 2. Implementación de Repositorio (Persistencia)
- **Ruta**: `apps/api/src/modules/compras/infrastructure/persistencia/historial.repository.pg.ts`
- Se implementó la consulta SQL directa a la base de datos (PostgreSQL).
- Para el listado (`listar`), se incluyó lógica de filtrado por estado, ordenamiento dinámico por `created_at` o `total_amount`, paginación (offset y limit), y totalizado de páginas con `COUNT()`.
- Para el detalle (`detalle`), se creó un query con `JOIN` hacia `order_items` empaquetando en JSON (`json_agg`) las líneas de compra (nombre, cantidad, precios y descuentos) junto con los datos del domicilio.
- Se añadió el estado temporal nulo a `tracking_code` que actuará de stub hasta la implementación del tracking real (CU-13).

### 3. Implementación de Errores (Dominio)
- **Ruta**: `apps/api/src/modules/compras/domain/errores.ts`
- Se agregó el error `OrdenNoEncontrada` el cual es lanzado al intentar acceder a un pedido inexistente o que no pertenece al usuario actual, retornando un `404 NOT FOUND`.

### 4. Implementación del Caso de Uso (Aplicación)
- **Ruta**: `apps/api/src/modules/compras/application/ver-historial.ts`
- Clase `VerHistorial` con los métodos delegados para listar y ver detalle.

### 5. Controladores y Esquemas (Infraestructura HTTP)
- **Controlador**: `apps/api/src/modules/compras/infrastructure/http/historial.controller.ts`
- **Rutas**: 
  - `GET /pedidos`: Acepta filtros en query string y lista el historial.
  - `GET /pedidos/:id`: Devuelve el detalle del pedido.
- **Esquemas Zod**: `apps/api/src/modules/compras/infrastructure/http/esquemas.ts` (se incluyó validación estricta para la request de filtro de historial mediante `FiltroHistorialSchema`).

### 6. Contrato API (OpenAPI)
- **Ruta**: `docs/_archivo-v1/02-arquitectura/2.4-contratos/openapi.yaml`
- Se añadieron los endpoints `GET /pedidos` y `GET /pedidos/{pedido_id}` con sus respectivas respuestas, esquemas y parámetros vinculados al CU-05.

### 7. Inyección de Dependencias
- **Ruta**: `apps/api/src/modules/compras/infrastructure/compras.module.ts`
- Se inyectó `HistorialRepositoryPg` y `VerHistorial` en los providers de NestJS y se agregó el nuevo controlador de historial.

## Siguientes Pasos
Este CU ha sido implementado exitosamente. Por favor, revisá este informe. Una vez que me des luz verde (siguiendo tu instrucción de "informar y parar"), podré avanzar con el siguiente caso de uso.
