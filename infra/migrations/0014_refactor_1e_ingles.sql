-- Migración 0014 · Etapa 1e — institucional, comunidad y plataforma al inglés
--
-- Cierra el pase de nomenclatura: las diez tablas que quedaban en español. A diferencia de las
-- etapas 1a-1d, acá varias tablas cambian de FORMA y no sólo de nombre, porque el esquema
-- objetivo modela lo que piden los CU y la v1 modelaba otra cosa. Cada cambio de forma cita
-- abajo el CU que lo respalda.
--
-- Verificado contra producción ANTES de escribir esto:
--   · instituciones, membresias, catalogo_institucional, sesiones_uso, encuestas, preguntas,
--     respuestas y propuestas tienen CERO filas → los cambios de forma no migran datos.
--   · eventos_auditoria tiene 21 filas y outbox_emails 12 (10 enviados, 2 fallidos, NINGUNO
--     pendiente) → esas dos se migran preservando el contenido.
--   · `levels` tiene exactamente las tres filas que ofrece el selector de CU-23 (Inicial,
--     Primaria, Secundaria).

-- ════════════════════════════════════════════════════════════════════════════
--  1 · INSTITUCIONES  →  institutions            (CU-23)
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE instituciones RENAME TO institutions;
ALTER TABLE institutions RENAME COLUMN razon_social TO legal_name;   -- CU-23 p13
ALTER TABLE institutions RENAME COLUMN cuit         TO tax_id;       -- CU-23 p13, RN-001
ALTER TABLE institutions RENAME COLUMN creado_en    TO created_at;

-- CU-23 RN-001: el CUIT es único. La v1 no lo restringía.
ALTER TABLE institutions ADD CONSTRAINT institutions_tax_id_uq UNIQUE (tax_id);

-- CU-23 p13 y RN-002: el email institucional es obligatorio y único. No existía en la v1.
ALTER TABLE institutions ADD COLUMN email varchar(255) NOT NULL UNIQUE;

-- Addendum IV: teléfono y cantidad de alumnos, ambos opcionales (CU-23 p3, A11).
ALTER TABLE institutions ADD COLUMN phone         varchar(30);
ALTER TABLE institutions ADD COLUMN student_count integer CHECK (student_count IS NULL OR student_count > 0);

-- domicilio (jsonb) → columnas planas, igual que `users` en la etapa 1a (CU-23 p3 "Dirección").
ALTER TABLE institutions
  ADD COLUMN street      varchar(150),
  ADD COLUMN number      varchar(20),
  ADD COLUMN city        varchar(100),
  ADD COLUMN province    varchar(100),
  ADD COLUMN postal_code varchar(20);
UPDATE institutions SET
  street      = domicilio->>'calle',
  number      = domicilio->>'numero',
  city        = domicilio->>'localidad',
  province    = domicilio->>'provincia',
  postal_code = domicilio->>'codigo_postal'
WHERE domicilio IS NOT NULL;
ALTER TABLE institutions DROP COLUMN domicilio;

-- nivel_educativo (enumeración de 5 valores) → level_id (FK a `levels`), según addendum IV.
-- CU-23 A11.1 fija el selector en "Inicial, Primaria, Secundaria": `superior` y `mixto` no
-- tienen respaldo en ningún CU y desaparecen sin pérdida (la tabla está vacía). Con esto queda
-- resuelta la primera de las dos enumeraciones que la ronda anterior dejó abiertas.
ALTER TABLE institutions ADD COLUMN level_id uuid REFERENCES levels(id) ON DELETE SET NULL;
UPDATE institutions i SET level_id = l.id
  FROM levels l
 WHERE (i.nivel_educativo = 'inicial'    AND l.name = 'Inicial')
    OR (i.nivel_educativo = 'primario'   AND l.name = 'Primaria')
    OR (i.nivel_educativo = 'secundario' AND l.name = 'Secundaria');
ALTER TABLE institutions DROP COLUMN nivel_educativo;
CREATE INDEX idx_institutions_level ON institutions (level_id);

-- `estado` NO tiene respaldo: ningún CU suspende ni da de baja una institución, y el esquema
-- objetivo no define la columna. Se traduce y se CONSERVA — su retiro se reporta, no se decide
-- acá (regla de la matriz de trazabilidad).
ALTER TABLE institutions RENAME COLUMN estado TO status;

-- ════════════════════════════════════════════════════════════════════════════
--  2 · MEMBRESIAS  →  institutional_teachers     (CU-23, CU-28)
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE membresias RENAME TO institutional_teachers;
ALTER TABLE institutional_teachers RENAME COLUMN institucion_id TO institution_id;
ALTER TABLE institutional_teachers RENAME COLUMN cuenta_id      TO user_id;      -- CU-23 p14
ALTER TABLE institutional_teachers RENAME COLUMN activada_en    TO joined_at;

-- `rol` (encargado|docente) → `is_admin` booleano, que es como lo nombran CU-23 RN-004/RN-008,
-- CU-25 RN-004, CU-26 RN-001, CU-27 RN-001 y CU-28 RN-001.
ALTER TABLE institutional_teachers ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
UPDATE institutional_teachers SET is_admin = (rol = 'manager');
ALTER TABLE institutional_teachers DROP COLUMN rol;

-- Columnas del flujo de invitación (CU-23 A12.8b: el docente sin cuenta recibe un correo con un
-- enlace que lleva un token identificando a la institución; el vínculo se completa al
-- registrarse). El esquema objetivo NO las modela: se conservan traducidas y la divergencia se
-- reporta, porque el CU las respalda y la regla prohíbe retirarlas por cuenta propia.
-- `user_id` sigue siendo NULL hasta que la invitación se acepta.
ALTER TABLE institutional_teachers RENAME COLUMN email_invitado        TO invited_email;
ALTER TABLE institutional_teachers RENAME COLUMN token_invitacion_hash TO invitation_token_hash;
ALTER TABLE institutional_teachers RENAME COLUMN invitada_en           TO invited_at;
ALTER TABLE institutional_teachers RENAME COLUMN desvinculada_en       TO unlinked_at;
ALTER TABLE institutional_teachers RENAME COLUMN estado                TO status;

-- CU-23 "sin vínculos duplicados": un docente no se vincula dos veces a la misma institución.
-- Las invitaciones pendientes (user_id NULL) no colisionan entre sí, que es lo que corresponde.
ALTER TABLE institutional_teachers
  ADD CONSTRAINT uq_institution_user UNIQUE (institution_id, user_id);

-- CU-23 RN-003: un usuario es encargado de UNA sola institución.
CREATE UNIQUE INDEX uq_single_admin_per_user
  ON institutional_teachers (user_id) WHERE is_admin = true;

-- ════════════════════════════════════════════════════════════════════════════
--  3 · CATALOGO_INSTITUCIONAL  →  institutional_inventories   (CU-25, CU-26)
-- ════════════════════════════════════════════════════════════════════════════
-- Cambio de forma: la v1 guardaba una fila por ejemplar; CU-25 pide cantidades agregadas por
-- producto (adquirida, asignada, disponible = adquirida - asignada, RN-002). Sin filas que
-- migrar. `origen_pedido_id` desaparece: el historial de compras que pide CU-25 RN-007 sale de
-- orders + order_items, que ya guardan institution_id y product_id.
ALTER TABLE catalogo_institucional RENAME TO institutional_inventories;
ALTER TABLE institutional_inventories RENAME COLUMN institucion_id TO institution_id;
ALTER TABLE institutional_inventories RENAME COLUMN juego_id       TO product_id;
ALTER TABLE institutional_inventories RENAME COLUMN agregado_en    TO acquired_at;
ALTER TABLE institutional_inventories DROP COLUMN origen_pedido_id;

ALTER TABLE institutional_inventories
  ADD COLUMN quantity_purchased integer NOT NULL DEFAULT 0 CHECK (quantity_purchased >= 0),
  ADD COLUMN quantity_assigned  integer NOT NULL DEFAULT 0 CHECK (quantity_assigned  >= 0);

ALTER TABLE institutional_inventories
  ADD CONSTRAINT uq_institution_product UNIQUE (institution_id, product_id),
  -- CU-26 RN-005: no se puede asignar más de lo adquirido.
  ADD CONSTRAINT assigned_not_exceed_purchased CHECK (quantity_assigned <= quantity_purchased);

-- ════════════════════════════════════════════════════════════════════════════
--  4 · institutional_assignments  (NUEVA)        (CU-26, CU-27, CU-28)
-- ════════════════════════════════════════════════════════════════════════════
-- No existía nada equivalente en la v1: `catalogo_institucional` era inventario, no asignación
-- por docente. CU-26 RN-006 fija las columnas; CU-28 RN-007/RN-008 exigen conservar las
-- asignaciones revocadas con su fecha y su autor, por eso la revocación es un ESTADO y no un
-- borrado (ver el informe: CU-027 p18.1 dice "eliminar el registro" y contradice a CU-028).
CREATE TYPE assignment_status AS ENUM ('active', 'revoked');

CREATE TABLE institutional_assignments (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id            uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  institutional_teacher_id  uuid NOT NULL REFERENCES institutional_teachers(id) ON DELETE CASCADE,
  product_id                uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_assigned         integer NOT NULL CHECK (quantity_assigned > 0),   -- CU-26 RN-004
  status                    assignment_status NOT NULL DEFAULT 'active',
  assigned_by               uuid NOT NULL REFERENCES institutional_teachers(id) ON DELETE RESTRICT,
  assigned_at               timestamptz NOT NULL DEFAULT now(),
  revoked_at                timestamptz,
  revoked_by                uuid REFERENCES institutional_teachers(id) ON DELETE SET NULL,
  revocation_reason         varchar(500),
  -- Coherencia del estado revocado con sus campos (D-33 del esquema).
  CONSTRAINT revocation_consistency CHECK (
       (status = 'active'  AND revoked_at IS NULL AND revoked_by IS NULL)
    OR (status = 'revoked' AND revoked_at IS NOT NULL)
  )
);
CREATE INDEX idx_assignments_teacher     ON institutional_assignments (institutional_teacher_id);
CREATE INDEX idx_assignments_institution ON institutional_assignments (institution_id);
ALTER TABLE institutional_assignments ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════════════════
--  5 · SESIONES_USO  →  game_sessions            (CU-29, CU-30)
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE sesiones_uso RENAME TO game_sessions;
ALTER TABLE game_sessions RENAME COLUMN membresia_id     TO institutional_teacher_id;  -- CU-29 p18
ALTER TABLE game_sessions RENAME COLUMN juego_id         TO product_id;
ALTER TABLE game_sessions RENAME COLUMN fecha            TO session_date;
ALTER TABLE game_sessions RENAME COLUMN curso            TO group_name;
ALTER TABLE game_sessions RENAME COLUMN cantidad_alumnos TO student_count;
ALTER TABLE game_sessions RENAME COLUMN duracion_min     TO duration_minutes;
ALTER TABLE game_sessions RENAME COLUMN observaciones    TO difficulties;   -- CU-29: "Dificultades encontradas" (opcional)
ALTER TABLE game_sessions RENAME COLUMN creado_en        TO created_at;

-- `institucion_id` sale: es derivable por institutional_teacher_id y el esquema no la define.
ALTER TABLE game_sessions DROP COLUMN institucion_id;

-- `editable_hasta` NO tiene respaldo: CU-30 sólo permite VER las sesiones, ningún CU las edita
-- (la ventana de 48 h venía de PI-02, un requerimiento de la v1, que no es vinculante). Se
-- conserva traducida, pero deja de ser obligatoria: siendo NOT NULL sin default, bloquearía el
-- alta de sesiones de CU-29. Su retiro se reporta.
ALTER TABLE game_sessions RENAME COLUMN editable_hasta TO editable_until;
ALTER TABLE game_sessions ALTER COLUMN editable_until DROP NOT NULL;

-- Las tres columnas que CU-29 pide y la v1 no tenía. La tabla está vacía, así que van NOT NULL
-- directamente, sin default de relleno.
ALTER TABLE game_sessions
  ADD COLUMN teacher_satisfaction smallint NOT NULL CHECK (teacher_satisfaction BETWEEN 1 AND 5), -- RN-005
  ADD COLUMN key_learnings        text     NOT NULL CHECK (char_length(key_learnings) >= 20),     -- RN-004
  ADD COLUMN would_reuse          boolean  NOT NULL DEFAULT true;                                 -- CU-29 p6

-- CU-29 RN-002: la fecha de la sesión no puede ser futura.
ALTER TABLE game_sessions
  ADD CONSTRAINT session_date_not_future CHECK (session_date <= CURRENT_DATE);

-- CU-29 RN-003 pide sólo "mayores a 0". La v1 acota además por arriba (1-100 alumnos, 5-240
-- minutos) citando PI-05, que no es un CU. Los límites se CONSERVAN —cumplen la regla del CU con
-- creces— y su holgura se reporta para que el equipo decida.
--
-- El FK a institutional_teachers queda en ON DELETE RESTRICT, como lo dejó la v1, y NO en el
-- CASCADE que define el esquema: CU-29 RN-008 hace visibles estas sesiones en el reporte
-- institucional de CU-31, y un CASCADE las borraría junto con el docente. Se reporta.

CREATE INDEX idx_sessions_teacher ON game_sessions (institutional_teacher_id, session_date DESC); -- CU-30 RN-002

-- ════════════════════════════════════════════════════════════════════════════
--  6 · ENCUESTAS/PREGUNTAS/RESPUESTAS  →  polls/poll_options/poll_responses
--      (CU-14, CU-16, CU-20)
-- ════════════════════════════════════════════════════════════════════════════
-- Cambio de forma respaldado por CU-20 ("encuestas DE OPCIÓN MÚLTIPLE, configurando LA PREGUNTA
-- y LAS OPCIONES de respuesta, mínimo 2 máximo 10") y CU-14 ("visualiza la pregunta y las
-- opciones, y selecciona UNA opción"). La v1 modelaba un cuestionario de N preguntas con cuatro
-- tipos: nada de eso lo pide un CU. Las tres tablas están vacías.
ALTER TABLE encuestas RENAME TO polls;
ALTER TABLE polls RENAME COLUMN estado    TO status;
ALTER TABLE polls RENAME COLUMN creado_en TO created_at;

-- La pregunta pasa a vivir en la encuesta (una sola, CU-20). `titulo` es lo más cercano en la
-- v1 y no se pierde nada: la tabla está vacía.
ALTER TABLE polls RENAME COLUMN titulo TO question;
ALTER TABLE polls ALTER COLUMN question TYPE text;

-- CU-20 RN-008 / CU-14 RN-003: nivel educativo objetivo, opcional, para filtrar.
ALTER TABLE polls ADD COLUMN target_level_id uuid REFERENCES levels(id) ON DELETE SET NULL;

-- Sin respaldo en ningún CU: `descripcion` y la ventana de vigencia. CU-20 gobierna la
-- visibilidad con el estado (draft/active/closed), no con fechas. Se conservan traducidas.
ALTER TABLE polls RENAME COLUMN descripcion   TO description;
ALTER TABLE polls RENAME COLUMN vigente_desde TO valid_from;
ALTER TABLE polls RENAME COLUMN vigente_hasta TO valid_until;

-- `preguntas` (N por encuesta, cuatro tipos) → `poll_options` (las opciones de LA pregunta).
DROP TABLE respuestas;
DROP TABLE preguntas;

CREATE TABLE poll_options (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,   -- CU-20 RN-006: cascada
  text    varchar(300) NOT NULL CHECK (char_length(trim(text)) > 0) -- CU-20 RN-003: no vacías
);
CREATE INDEX idx_poll_options_poll ON poll_options (poll_id);
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;

CREATE TABLE poll_responses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id    uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id  uuid NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- CU-14 RN-006: anónimo no vota
  created_at timestamptz NOT NULL DEFAULT now(),
  -- CU-14 RN-001: un usuario vota una sola vez por encuesta.
  CONSTRAINT uq_poll_user UNIQUE (poll_id, user_id)
);
-- Addendum III: el recuento de CU-16 se calcula en tiempo de consulta sobre esta tabla.
CREATE INDEX idx_poll_responses_opt ON poll_responses (option_id);
ALTER TABLE poll_responses ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════════════════
--  7 · PROPUESTAS  →  proposals                  (CU-15, CU-21)
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE propuestas RENAME TO proposals;
ALTER TABLE proposals RENAME COLUMN cuenta_id     TO user_id;
ALTER TABLE proposals RENAME COLUMN titulo        TO title;
ALTER TABLE proposals RENAME COLUMN descripcion   TO description;
ALTER TABLE proposals RENAME COLUMN mensaje_admin TO admin_feedback;   -- CU-21 RN-003
ALTER TABLE proposals RENAME COLUMN creado_en     TO created_at;

-- CU-15 RN-002: la descripción debe tener al menos 50 caracteres.
ALTER TABLE proposals ADD CONSTRAINT description_min_length CHECK (char_length(description) >= 50);

-- CU-21: cada revisión actualiza la propuesta.
ALTER TABLE proposals ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE TRIGGER trg_proposals_updated BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- `area` (texto libre) → subject_id (FK a `subjects`), como pide CU-15 p13.
ALTER TABLE proposals DROP COLUMN area;
ALTER TABLE proposals ADD COLUMN subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL;

-- CU-15 p4: "Nivel educativo al que está dirigido (opcional)". La v1 guardaba una EDAD, que no
-- es lo que pide el CU — mismo criterio que el retiro de `target_age` en la etapa 1b.
ALTER TABLE proposals DROP COLUMN edad_objetivo;
ALTER TABLE proposals ADD COLUMN target_level_id uuid REFERENCES levels(id) ON DELETE SET NULL;

-- Sin respaldo en ningún CU: `numero` y `adjunto_ref` (CU-15 no pide adjunto). Se conservan
-- traducidos y su retiro se reporta. `numero` deja de ser obligatorio: era NOT NULL sin default
-- y, sin ningún CU que diga quién lo genera, bloquearía el alta de propuestas de CU-15.
ALTER TABLE proposals RENAME COLUMN numero      TO number;
ALTER TABLE proposals RENAME COLUMN adjunto_ref TO attachment_ref;
ALTER TABLE proposals ALTER COLUMN number DROP NOT NULL;

-- `estado_propuesta` → `proposal_status`. CU-21 RN-002 fija los estados en pending / reviewed /
-- approved / rejected, y ni CU-15 ni CU-21 contemplan retirar una propuesta: `retirada` NO tiene
-- respaldo y desaparece sin pérdida (tabla vacía). Con esto queda resuelta la segunda
-- enumeración que la ronda anterior dejó abierta — y corrige lo que informé antes.
CREATE TYPE proposal_status AS ENUM ('pending', 'reviewed', 'approved', 'rejected');
ALTER TABLE proposals ALTER COLUMN estado DROP DEFAULT;
ALTER TABLE proposals
  ALTER COLUMN estado TYPE proposal_status
  USING (CASE estado::text
           WHEN 'recibida'    THEN 'pending'
           WHEN 'en_revision' THEN 'reviewed'
           WHEN 'aceptada'    THEN 'approved'
           WHEN 'rechazada'   THEN 'rejected'
         END)::proposal_status;
ALTER TABLE proposals ALTER COLUMN estado SET DEFAULT 'pending';   -- CU-15 RN-003
ALTER TABLE proposals RENAME COLUMN estado TO status;
DROP TYPE estado_propuesta;

-- ════════════════════════════════════════════════════════════════════════════
--  8 · notifications  (NUEVA)                    (CU-15, CU-21, CU-26, CU-27)
-- ════════════════════════════════════════════════════════════════════════════
-- CU-26 RN-008 y CU-27 RN-005 dicen "notificación (email O DASHBOARD)". La vía dashboard es
-- in-app y `outbox_emails` no la cubre. También la piden CU-15 RN-005 y CU-21 RN-005.
CREATE TABLE notifications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                varchar(50)  NOT NULL,
  title               varchar(200) NOT NULL,
  message             text NOT NULL,
  related_entity_type varchar(100),
  related_entity_id   uuid,
  is_read             boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_unread
  ON notifications (recipient_user_id, created_at DESC) WHERE is_read = false;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════════════════
--  9 · EVENTOS_AUDITORIA  →  audit_log           (RNF-SIS-016)
-- ════════════════════════════════════════════════════════════════════════════
-- 21 filas en producción: se preservan. Append-only, sin UPDATE ni DELETE.
ALTER TABLE eventos_auditoria RENAME TO audit_log;
ALTER TABLE audit_log RENAME COLUMN actor_id    TO actor_user_id;
ALTER TABLE audit_log RENAME COLUMN tipo        TO action;
ALTER TABLE audit_log RENAME COLUMN sujeto_tipo TO entity_type;
ALTER TABLE audit_log RENAME COLUMN sujeto_id   TO entity_id;
ALTER TABLE audit_log RENAME COLUMN creado_en   TO created_at;

-- `datos` (jsonb genérico) → el par old_values/new_values del esquema. Lo ya registrado describe
-- el estado resultante, así que se preserva íntegro en `new_values`; CU-21 RN-004 (old_status →
-- new_status) es el caso que motiva el par.
ALTER TABLE audit_log RENAME COLUMN datos TO new_values;
ALTER TABLE audit_log ADD COLUMN old_values jsonb;

-- El esquema define entity_id NOT NULL y no hay ninguna fila con nulo (verificado).
ALTER TABLE audit_log ALTER COLUMN entity_id SET NOT NULL;

-- `ip` no está en el esquema objetivo, pero el registro de auditoría de RNF-SIS-016 pierde
-- valor forense sin ella. Se conserva (el nombre es igual en ambos idiomas) y se reporta.
--
-- No se agrega índice por (entity_type, entity_id): el de la v1 ya lo cubre y sólo le falta el
-- nombre en inglés, que le pone la migración 0015.

-- ════════════════════════════════════════════════════════════════════════════
--  10 · OUTBOX_EMAILS — columnas al inglés       (CU-E05, RF-CU12-006)
-- ════════════════════════════════════════════════════════════════════════════
-- 12 filas en producción (10 enviadas, 2 fallidas, ninguna pendiente): se preservan.
ALTER TABLE outbox_emails RENAME COLUMN destinatario TO recipient;
ALTER TABLE outbox_emails RENAME COLUMN tipo         TO template;
ALTER TABLE outbox_emails RENAME COLUMN estado       TO status;
ALTER TABLE outbox_emails RENAME COLUMN intentos     TO attempts;
ALTER TABLE outbox_emails RENAME COLUMN ultimo_error TO last_error;
ALTER TABLE outbox_emails RENAME COLUMN creado_en    TO created_at;
ALTER TABLE outbox_emails RENAME COLUMN procesado_en TO sent_at;

ALTER TABLE outbox_emails ADD CONSTRAINT attempts_non_negative CHECK (attempts >= 0);

-- El esquema guarda el mensaje YA RENDERIZADO (subject + body) en vez del payload: el outbox
-- queda inmutable y completo al escribirse, y el envío no puede fallar por un error de plantilla.
-- Se agregan nullable, se rellenan y recién ahí se ponen NOT NULL.
ALTER TABLE outbox_emails ADD COLUMN subject varchar(300);
ALTER TABLE outbox_emails ADD COLUMN body    text;
UPDATE outbox_emails
   SET subject = '[migrado 0014] ' || template,
       body    = '<pre>' || coalesce(payload::text, '{}') || '</pre>'
 WHERE subject IS NULL;
ALTER TABLE outbox_emails ALTER COLUMN subject SET NOT NULL;
ALTER TABLE outbox_emails ALTER COLUMN body    SET NOT NULL;
ALTER TABLE outbox_emails DROP COLUMN payload;

-- `email_id` era un uuid aleatorio por fila usado como clave de idempotencia ante el proveedor:
-- `id` (uuid PK) cumple exactamente esa función. Se retira por redundante.
ALTER TABLE outbox_emails DROP COLUMN email_id;

-- Trazabilidad de a qué operación pertenece cada correo (RF-CU12-006).
ALTER TABLE outbox_emails ADD COLUMN related_entity_type varchar(100);
ALTER TABLE outbox_emails ADD COLUMN related_entity_id   uuid;

-- Coherencia: sólo un correo enviado tiene fecha de envío. Las 2 filas fallidas de producción
-- traen `sent_at` nulo, así que la restricción entra sin conflicto.
UPDATE outbox_emails SET sent_at = NULL WHERE status <> 'sent';
ALTER TABLE outbox_emails ADD CONSTRAINT outbox_sent_consistency CHECK (
     (status =  'sent' AND sent_at IS NOT NULL)
  OR (status <> 'sent' AND sent_at IS NULL)
);

-- ════════════════════════════════════════════════════════════════════════════
--  11 · Enumeraciones que quedan huérfanas por esta migración
-- ════════════════════════════════════════════════════════════════════════════
-- `membership_role` (reemplazada por is_admin, CU-23 RN-004) y `question_type` (la tabla
-- `preguntas` ya no existe) no las usa ninguna columna. NO se retiran acá: se suman a la lista
-- de huérfanas del informe para una única decisión de retiro.
