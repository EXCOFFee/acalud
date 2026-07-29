-- ============================================================================
--  SISTEMA ACALUD — Addendum V
--  Motor: PostgreSQL 15+
--  Aplicar DESPUÉS de acalud_schema.sql y los addenda I a IV
-- ============================================================================
--
--  JUSTIFICACIÓN
--
--  Este addendum incorpora un estado de orden que el dominio requiere y que el
--  esquema base no contemplaba.
--
-- ============================================================================


-- ----------------------------------------------------------------------------
--  1. ESTADO DE ORDEN EN REVISIÓN
--
--  Origen: RNF-CU12-002 — "El sistema procesa notificaciones simultáneas sin
--  conflictos de actualización."
--
--  CU-12 contempla el agotamiento de existencias en su flujo alternativo A1,
--  que deriva del paso 5 del flujo principal: la verificación ocurre antes de
--  derivar a la pasarela, y su resolución es redirigir al carrito señalando los
--  productos afectados. Ese caso queda cubierto: la orden permanece pendiente y
--  el usuario no llegó a pagar.
--
--  Existe sin embargo un segundo caso que las especificaciones no describen y
--  que resulta del requerimiento de procesar notificaciones simultáneas. Dos
--  compras de la última unidad disponible pueden superar ambas la verificación
--  previa, derivar ambas a la pasarela, y resultar ambas aprobadas. Al arribar
--  las notificaciones, el decremento condicional de existencias sólo puede
--  prosperar en una de ellas.
--
--  La orden que no prospera requiere un estado propio. Ninguno de los previstos
--  la describe:
--
--    · `pending` sería incorrecto: el pago se efectuó y fue aprobado.
--    · `paid` sería incorrecto: la orden no puede cumplirse por falta de
--      existencias.
--    · `cancelled` sería incorrecto: el importe fue percibido y no devuelto.
--
--  El estado que se incorpora representa una orden pagada cuya entrega no puede
--  concretarse y que requiere resolución: reposición de existencias o
--  devolución del importe. La resolución excede el alcance de las
--  especificaciones y es una operación administrativa.
-- ----------------------------------------------------------------------------

ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'under_review';

-- Nota de aplicación: en PostgreSQL, la incorporación de un valor a un tipo
-- enumerado no puede ejecutarse dentro de un bloque de transacción junto con su
-- primer uso. Corresponde aplicar esta sentencia en una migración propia,
-- separada de aquellas que la utilicen.


-- ============================================================================
--  NOTA SOBRE EL DOMINIO RESULTANTE
--
--  El dominio completo de `order_status` queda así:
--
--    pending       orden creada, pago no confirmado
--    paid          pago confirmado, existencias descontadas
--    under_review  pago confirmado, existencias insuficientes: requiere
--                  resolución administrativa
--    shipped       despachada
--    delivered     entregada
--    cancelled     cancelada sin percepción de importe
--
--  La transición hacia el nuevo estado se produce únicamente desde `pending`, al
--  procesarse una notificación de pago aprobado cuyo decremento condicional de
--  existencias no prospera. Desde él, la resolución administrativa conduce a
--  `paid` —si se repone la existencia— o a `cancelled` —si se devuelve el
--  importe—.
-- ============================================================================


-- ============================================================================
--  FIN DEL ADDENDUM V
--
--  Resumen: 1 valor de tipo enumerado.
--
--  Nota de cierre: con este addendum son cinco los artefactos complementarios
--  del esquema base. Al concluir el refactor corresponde consolidarlos en un
--  único artefacto canónico, conservando los addenda como registro de las
--  decisiones que condujeron a él.
-- ============================================================================
