-- Migración 0008 · Retiro de elementos sin respaldo en ningún caso de uso
--
-- Fundamento: docs/06-trazabilidad/F6-Matriz-Trazabilidad-CU-Implementacion.md §3.
-- Regla que gobierna: los 34 CU son la fuente de verdad; todo lo que existe debe estar
-- respaldado por un CU. Cada retiro se justifica abajo con su fila de la matriz.
--
-- Verificado antes de ejecutar (contra el esquema reconstruido y el código):
--   · ningún archivo de apps/ ni packages/ consulta `tabla_tarifas` ni la tabla `comprobantes`;
--   · ninguna columna viva usa estado_cuenta, tipo_token ni tipo_recurso;
--   · `tipo_comprobante` solo lo usaba `comprobantes.tipo`, que se retira con su tabla.

-- ─────────────────────────── 1 · Comprobantes ───────────────────────────
-- La factura la emite Mercado Pago. CU-12 contempla la factura únicamente como flujo
-- alternativo opcional (A9) y entrega el comprobante por correo, que ya cubre `outbox_emails`.
-- Los términos `cae`, `arca` y `AFIP` no aparecen en ningún CU.
DROP TABLE comprobantes;
DROP TYPE tipo_comprobante;

-- ─────────────────────────── 2 · Tarifas locales de envío ───────────────────────────
-- CU-11 delega el cálculo a un proveedor logístico externo, y su flujo A2 resuelve la falla del
-- proveedor con HTTP 503, botón "Reintentar" y la opción de continuar sin calcular el envío.
-- No define un respaldo local de tarifas. La tabla además estaba muerta en el código.
DROP TABLE tabla_tarifas;

-- ─────────────────────────── 3 · Tipos enumerados huérfanos ───────────────────────────
-- Las columnas que los usaban se reemplazaron en las etapas 1a y 1b (users.email_verified,
-- user_tokens.purpose y resources.type) y los tipos quedaron sin retirar.
DROP TYPE estado_cuenta;
DROP TYPE tipo_token;
DROP TYPE tipo_recurso;
