-- Migración 0013 · Pase de enumeraciones al inglés (Tarea 4)
--
-- Criterio único: cuando los valores reales corresponden uno a uno con los documentados (o su
-- traducción es unívoca), se usa ALTER TYPE ... RENAME TO / RENAME VALUE, que no toca datos.
-- Cuando los conjuntos difieren de forma ambigua, NO se resuelve acá y se reporta.
--
-- Quedan FUERA por ambigüedad (ver informe):
--   · estado_propuesta: cinco valores reales contra cuatro documentados; `retirada` no tiene
--     destino en `proposal_status`.
--   · nivel_educativo: el documento lo modela como tabla maestra `levels` (tres filas) y no como
--     enumeración de cinco valores; `superior` y `mixto` no existen allí.
--
-- Ya estaban en inglés: order_status, resource_type, token_purpose, user_role.

-- ─────────── Identidad / institucional ───────────
ALTER TYPE estado_institucion RENAME TO institution_status;
ALTER TYPE institution_status RENAME VALUE 'activa'     TO 'active';
ALTER TYPE institution_status RENAME VALUE 'suspendida' TO 'suspended';

ALTER TYPE estado_membresia RENAME TO membership_status;
ALTER TYPE membership_status RENAME VALUE 'invitada'      TO 'invited';
ALTER TYPE membership_status RENAME VALUE 'activa'        TO 'active';
ALTER TYPE membership_status RENAME VALUE 'desvinculada'  TO 'unlinked';
ALTER TYPE membership_status RENAME VALUE 'vencida'       TO 'expired';

ALTER TYPE rol_membresia RENAME TO membership_role;
ALTER TYPE membership_role RENAME VALUE 'encargado' TO 'manager';
ALTER TYPE membership_role RENAME VALUE 'docente'   TO 'teacher';

-- ─────────── Compras y logística ───────────
-- El documento nombra los segmentos b2c/b2b, y la restricción de coherencia de la orden los usa.
ALTER TYPE tipo_comprador RENAME TO order_type;
ALTER TYPE order_type RENAME VALUE 'personal'    TO 'b2c';
ALTER TYPE order_type RENAME VALUE 'institucion' TO 'b2b';

ALTER TYPE modalidad_envio RENAME TO shipping_modality;
ALTER TYPE shipping_modality RENAME VALUE 'domicilio' TO 'home_delivery';
ALTER TYPE shipping_modality RENAME VALUE 'sucursal'  TO 'branch_pickup';

-- `micorreo` es nombre propio del servicio y se conserva. `tabla_local` nombraba una tabla ya
-- retirada: pasa a describir lo que es, el respaldo local del adaptador.
ALTER TYPE origen_envio RENAME TO shipping_quote_source;
ALTER TYPE shipping_quote_source RENAME VALUE 'tabla_local' TO 'local_fallback';

ALTER TYPE origen_tracking RENAME TO tracking_source;   -- valores ya en inglés / nombre propio

ALTER TYPE tipo_movimiento_stock RENAME TO stock_movement_type;
ALTER TYPE stock_movement_type RENAME VALUE 'venta'      TO 'sale';
ALTER TYPE stock_movement_type RENAME VALUE 'reposicion' TO 'restock';
ALTER TYPE stock_movement_type RENAME VALUE 'ajuste'     TO 'adjustment';

ALTER TYPE motivo_ajuste_stock RENAME TO stock_adjustment_reason;
ALTER TYPE stock_adjustment_reason RENAME VALUE 'recepcion'  TO 'receipt';
ALTER TYPE stock_adjustment_reason RENAME VALUE 'merma'      TO 'shrinkage';
ALTER TYPE stock_adjustment_reason RENAME VALUE 'correccion' TO 'correction';

-- ─────────── Catálogo y contenido ───────────
-- CU-08 (anónima) y CU-09 (personal, institucional) discriminan por esta vía.
ALTER TYPE via_descarga RENAME TO download_channel;
ALTER TYPE download_channel RENAME VALUE 'institucional' TO 'institutional';
ALTER TYPE download_channel RENAME VALUE 'anonima'       TO 'anonymous';

-- Huérfanos desde la etapa 1b (las demos pasaron a config_json). Se renombran para no dejar
-- nada en español; su retiro se reporta como pendiente, no se decide acá.
ALTER TYPE tipo_demo RENAME TO demo_type;
ALTER TYPE demo_type RENAME VALUE 'publica'  TO 'public';
ALTER TYPE demo_type RENAME VALUE 'completa' TO 'full';
ALTER TYPE formato_demo RENAME TO demo_format;   -- html5|pdf|video, ya en inglés

-- ─────────── Comunidad ───────────
ALTER TYPE estado_encuesta RENAME TO poll_status;
ALTER TYPE poll_status RENAME VALUE 'borrador'  TO 'draft';
ALTER TYPE poll_status RENAME VALUE 'publicada' TO 'active';
ALTER TYPE poll_status RENAME VALUE 'cerrada'   TO 'closed';

ALTER TYPE tipo_pregunta RENAME TO question_type;
ALTER TYPE question_type RENAME VALUE 'opcion_unica'    TO 'single_choice';
ALTER TYPE question_type RENAME VALUE 'opcion_multiple' TO 'multiple_choice';
ALTER TYPE question_type RENAME VALUE 'texto_libre'     TO 'free_text';
-- `escala_1_5` ya es legible en ambos idiomas; se conserva.

-- ─────────── Plataforma ───────────
ALTER TYPE estado_outbox RENAME TO outbox_status;
ALTER TYPE outbox_status RENAME VALUE 'pendiente' TO 'pending';
ALTER TYPE outbox_status RENAME VALUE 'enviado'   TO 'sent';
ALTER TYPE outbox_status RENAME VALUE 'fallido'   TO 'failed';
