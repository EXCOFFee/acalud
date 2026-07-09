-- ============================================================================
-- Migración 0001 · Esquema inicial de Acalud
-- La BD nace con las defensas puestas (Gate 0 / 5.1 §5). Tablas y constraints
-- según docs/02-arquitectura/2.3-dominio-y-datos.md (§5 invariantes, §6 datos y
-- constraints). Nombres en snake_case español = Glosario 0.2 = contrato 2.4.
-- Orden de creación: BC1 → BC2 → BC7 → BC3 → BC4 → BC5 → BC6 → Plataforma
-- (para que las FK apunten a tablas ya existentes; la única FK cruzada hacia
-- adelante —catalogo_institucional→pedidos— se agrega diferida al final).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- ─────────────────────────── Tipos enumerados ───────────────────────────
CREATE TYPE estado_cuenta          AS ENUM ('no_verificada', 'verificada');
CREATE TYPE tipo_token             AS ENUM ('verificacion_email', 'recuperacion_password', 'cambio_email');
CREATE TYPE tipo_demo              AS ENUM ('publica', 'completa');
CREATE TYPE formato_demo           AS ENUM ('html5', 'pdf', 'video');
CREATE TYPE tipo_recurso           AS ENUM ('libre', 'licenciado');
CREATE TYPE tipo_comprador         AS ENUM ('personal', 'institucion');
CREATE TYPE estado_pedido          AS ENUM ('pendiente_pago', 'pagado', 'rechazado', 'expirado',
                                            'en_preparacion', 'despachado', 'entregado', 'cancelado', 'en_revision');
CREATE TYPE modalidad_envio        AS ENUM ('domicilio', 'sucursal');
CREATE TYPE origen_envio           AS ENUM ('micorreo', 'tabla_local');
CREATE TYPE tipo_movimiento_stock  AS ENUM ('venta', 'reposicion', 'ajuste');
CREATE TYPE motivo_ajuste_stock    AS ENUM ('recepcion', 'merma', 'correccion');
CREATE TYPE origen_tracking        AS ENUM ('micorreo', 'manual');
CREATE TYPE tipo_comprobante       AS ENUM ('pdf', 'arca');
CREATE TYPE estado_encuesta        AS ENUM ('borrador', 'publicada', 'cerrada');
CREATE TYPE tipo_pregunta          AS ENUM ('opcion_unica', 'opcion_multiple', 'escala_1_5', 'texto_libre');
CREATE TYPE estado_propuesta       AS ENUM ('recibida', 'en_revision', 'aceptada', 'rechazada', 'retirada');
CREATE TYPE nivel_educativo        AS ENUM ('inicial', 'primario', 'secundario', 'superior', 'mixto');
CREATE TYPE estado_institucion     AS ENUM ('activa', 'suspendida');
CREATE TYPE rol_membresia          AS ENUM ('encargado', 'docente');
CREATE TYPE estado_membresia       AS ENUM ('invitada', 'activa', 'desvinculada', 'vencida');
CREATE TYPE via_descarga           AS ENUM ('personal', 'institucional', 'anonima');
CREATE TYPE estado_outbox          AS ENUM ('pendiente', 'enviado', 'fallido');

-- ═══════════════════════ BC1 · Identidad y Acceso ═══════════════════════
CREATE TABLE cuentas (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email              text NOT NULL,
  hash_password      text NOT NULL,
  nombre             text NOT NULL,
  apellido           text NOT NULL,
  telefono           text,
  domicilio          jsonb,
  estado             estado_cuenta NOT NULL DEFAULT 'no_verificada',
  es_admin           boolean NOT NULL DEFAULT false,
  two_factor_secret  text,
  two_factor_enabled boolean NOT NULL DEFAULT false,
  intentos_fallidos  smallint NOT NULL DEFAULT 0,
  bloqueada_hasta    timestamptz,
  ultimo_login       timestamptz,
  creada_en          timestamptz NOT NULL DEFAULT now()
);
-- UNIQUE cuentas(email) normalizado a minúsculas (CU-001 A1)
CREATE UNIQUE INDEX ux_cuentas_email_lower ON cuentas (lower(email));

CREATE TABLE sesiones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_id   uuid NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  ip          inet,
  user_agent  text,
  creada_en   timestamptz NOT NULL DEFAULT now(),
  expira_en   timestamptz NOT NULL,
  revocada_en timestamptz
);
CREATE INDEX ix_sesiones_cuenta ON sesiones (cuenta_id);

CREATE TABLE tokens_de_uso (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_id   uuid NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
  tipo        tipo_token NOT NULL,
  token_hash  text NOT NULL,
  email_nuevo text,                         -- solo tipo = 'cambio_email'
  usado       boolean NOT NULL DEFAULT false,
  expira_en   timestamptz NOT NULL,
  creado_en   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_tokens_cuenta_tipo ON tokens_de_uso (cuenta_id, tipo);

-- ═══════════════════════ BC2 · Catálogo y Contenido ═══════════════════════
CREATE TABLE juegos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        text NOT NULL,
  descripcion   text NOT NULL DEFAULT '',
  precio_lista  numeric(12,2) NOT NULL DEFAULT 0 CHECK (precio_lista >= 0),
  peso_gramos   integer NOT NULL DEFAULT 0 CHECK (peso_gramos >= 0),
  area          text,
  edad_objetivo text,
  imagenes      jsonb NOT NULL DEFAULT '[]'::jsonb,      -- claves de storage
  stock_actual  integer NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),  -- sobreventa (Lost Update)
  publicado     boolean NOT NULL DEFAULT false,
  creado_en     timestamptz NOT NULL DEFAULT now(),
  eliminado_en  timestamptz
);
CREATE INDEX ix_juegos_publicado ON juegos (publicado) WHERE eliminado_en IS NULL;

CREATE TABLE demos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  juego_id      uuid NOT NULL REFERENCES juegos(id) ON DELETE CASCADE,
  tipo          tipo_demo NOT NULL,
  formato       formato_demo NOT NULL,
  contenido_ref text NOT NULL,
  creado_en     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (juego_id, tipo)                                -- a lo sumo una demo por tipo (S-16)
);

CREATE TABLE recursos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  juego_id     uuid NOT NULL REFERENCES juegos(id) ON DELETE CASCADE,
  nombre       text NOT NULL,
  tipo         tipo_recurso NOT NULL,
  archivo_ref  text NOT NULL,
  creado_en    timestamptz NOT NULL DEFAULT now(),
  eliminado_en timestamptz
);
CREATE INDEX ix_recursos_juego ON recursos (juego_id);

CREATE TABLE editoriales (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            text NOT NULL,
  logo_ref          text,
  descripcion_breve text,
  descripcion       text,
  sitio_externo     text,
  publicado         boolean NOT NULL DEFAULT true,
  creado_en         timestamptz NOT NULL DEFAULT now(),
  eliminado_en      timestamptz
);

CREATE TABLE productos_exhibidos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  editorial_id uuid NOT NULL REFERENCES editoriales(id) ON DELETE CASCADE,
  nombre       text NOT NULL,
  descripcion  text,
  imagen_ref   text,
  creado_en    timestamptz NOT NULL DEFAULT now()
  -- sin precio ni compra por diseño (CU-017)
);

CREATE TABLE favoritos (
  cuenta_id    uuid NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
  editorial_id uuid NOT NULL REFERENCES editoriales(id) ON DELETE CASCADE,
  creado_en    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cuenta_id, editorial_id)                 -- favorito idempotente (S-20)
);

CREATE TABLE tramos_descuento (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  juego_id        uuid NOT NULL REFERENCES juegos(id) ON DELETE CASCADE,
  cantidad_minima integer NOT NULL CHECK (cantidad_minima >= 2),
  descuento_pct   integer NOT NULL CHECK (descuento_pct BETWEEN 1 AND 90),
  UNIQUE (juego_id, cantidad_minima)                    -- sin tramos duplicados (CU-022); monotonía en app
);

-- ═══════════════════════ BC7 · Institucional ═══════════════════════
CREATE TABLE instituciones (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social    text NOT NULL,
  cuit            text NOT NULL,
  nivel_educativo nivel_educativo NOT NULL,
  domicilio       jsonb NOT NULL,
  estado          estado_institucion NOT NULL DEFAULT 'activa',
  creado_en       timestamptz NOT NULL DEFAULT now()
);
-- no dos instituciones activas con el mismo CUIT (CU-023 E1)
CREATE UNIQUE INDEX ux_instituciones_cuit_activa ON instituciones (cuit) WHERE estado = 'activa';

CREATE TABLE membresias (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id        uuid NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  email_invitado        text NOT NULL,
  cuenta_id             uuid REFERENCES cuentas(id) ON DELETE SET NULL,  -- se liga al aceptar
  rol                   rol_membresia NOT NULL,
  estado                estado_membresia NOT NULL DEFAULT 'invitada',
  token_invitacion_hash text,
  invitada_en           timestamptz NOT NULL DEFAULT now(),
  activada_en           timestamptz,
  desvinculada_en       timestamptz
);
-- máx. una membresía vigente por (institución, email); el parcial permite re-invitar tras desvincular (CU-026 E1)
CREATE UNIQUE INDEX ux_membresias_vigente
  ON membresias (institucion_id, lower(email_invitado))
  WHERE estado IN ('invitada', 'activa');
CREATE INDEX ix_membresias_cuenta ON membresias (cuenta_id);

CREATE TABLE catalogo_institucional (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id   uuid NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  juego_id         uuid NOT NULL REFERENCES juegos(id) ON DELETE RESTRICT,
  origen_pedido_id uuid,                                 -- FK a pedidos (diferida al final)
  agregado_en      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institucion_id, juego_id)                     -- idempotencia del alta por lote (CU-024)
);

CREATE TABLE sesiones_uso (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membresia_id     uuid NOT NULL REFERENCES membresias(id) ON DELETE RESTRICT,   -- no borrar membresía con sesiones (S-03)
  institucion_id   uuid NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE, -- desnormalizado: sobrevive a la membresía (S-03)
  juego_id         uuid NOT NULL REFERENCES juegos(id) ON DELETE RESTRICT,
  fecha            date NOT NULL,
  curso            text NOT NULL,
  cantidad_alumnos integer NOT NULL CHECK (cantidad_alumnos BETWEEN 1 AND 100),  -- PI-05
  duracion_min     integer NOT NULL CHECK (duracion_min BETWEEN 5 AND 240),      -- PI-05
  observaciones    text,
  editable_hasta   timestamptz NOT NULL,                 -- ventana PI-02 (48 h)
  creado_en        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_sesiones_uso_institucion ON sesiones_uso (institucion_id);
CREATE INDEX ix_sesiones_uso_juego       ON sesiones_uso (juego_id);
CREATE INDEX ix_sesiones_uso_membresia   ON sesiones_uso (membresia_id);

-- ═══════════════════════ BC3 · Compras ═══════════════════════
CREATE TABLE carritos (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_id               uuid NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
  contexto_institucion_id uuid REFERENCES instituciones(id) ON DELETE CASCADE,   -- NULL = personal
  creado_en               timestamptz NOT NULL DEFAULT now(),
  actualizado_en          timestamptz NOT NULL DEFAULT now()
);
-- un carrito por (cuenta, contexto); el contexto NULL se normaliza para el índice único
CREATE UNIQUE INDEX ux_carritos_cuenta_ctx
  ON carritos (cuenta_id, COALESCE(contexto_institucion_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE TABLE carrito_lineas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrito_id uuid NOT NULL REFERENCES carritos(id) ON DELETE CASCADE,
  juego_id   uuid NOT NULL REFERENCES juegos(id) ON DELETE RESTRICT,
  cantidad   integer NOT NULL CHECK (cantidad BETWEEN 1 AND 99),     -- PC-04
  creado_en  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (carrito_id, juego_id)                                      -- upsert por juego
  -- precios y totales NO se almacenan: se calculan server-side (CU-010)
);

CREATE TABLE pedidos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero             text NOT NULL UNIQUE,
  comprador_tipo     tipo_comprador NOT NULL,
  cuenta_id          uuid NOT NULL REFERENCES cuentas(id) ON DELETE RESTRICT,     -- quién ejecutó
  institucion_id     uuid REFERENCES instituciones(id) ON DELETE RESTRICT,
  carrito_id         uuid REFERENCES carritos(id) ON DELETE SET NULL,             -- carrito-origen
  estado             estado_pedido NOT NULL DEFAULT 'pendiente_pago',
  domicilio_snapshot jsonb NOT NULL,                                              -- copia inmutable (CU-004/012)
  envio_modalidad    modalidad_envio NOT NULL,
  envio_costo        numeric(12,2) NOT NULL DEFAULT 0 CHECK (envio_costo >= 0),
  envio_origen       origen_envio,
  monto_total        numeric(12,2) NOT NULL DEFAULT 0 CHECK (monto_total >= 0),
  creado_en          timestamptz NOT NULL DEFAULT now(),
  actualizado_en     timestamptz NOT NULL DEFAULT now(),
  expira_en          timestamptz,                                                 -- PC-03 (48 h)
  CONSTRAINT ck_pedidos_comprador CHECK (
    (comprador_tipo = 'institucion' AND institucion_id IS NOT NULL) OR
    (comprador_tipo = 'personal'    AND institucion_id IS NULL)
  )
);
-- no más de un pedido pendiente_pago por carrito-origen (idempotencia por pedido, CU-012)
CREATE UNIQUE INDEX ux_pedidos_pendiente_por_carrito
  ON pedidos (carrito_id) WHERE estado = 'pendiente_pago' AND carrito_id IS NOT NULL;
CREATE INDEX ix_pedidos_cuenta      ON pedidos (cuenta_id);
CREATE INDEX ix_pedidos_institucion ON pedidos (institucion_id);
CREATE INDEX ix_pedidos_estado      ON pedidos (estado);

CREATE TABLE pedido_lineas (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id                uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  juego_id                 uuid NOT NULL REFERENCES juegos(id) ON DELETE RESTRICT,
  nombre_snapshot          text NOT NULL,
  cantidad                 integer NOT NULL CHECK (cantidad > 0),
  precio_unitario_snapshot numeric(12,2) NOT NULL CHECK (precio_unitario_snapshot >= 0),
  descuento_pct_snapshot   integer NOT NULL DEFAULT 0 CHECK (descuento_pct_snapshot BETWEEN 0 AND 90)
);
CREATE INDEX ix_pedido_lineas_pedido ON pedido_lineas (pedido_id);

CREATE TABLE pagos_procesados (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id       text NOT NULL UNIQUE,                 -- idempotencia del webhook (CU-012 E1)
  pedido_id        uuid NOT NULL REFERENCES pedidos(id) ON DELETE RESTRICT,
  estado_mp        text NOT NULL,
  monto_notificado numeric(12,2),
  payload_crudo    jsonb NOT NULL,
  procesado_en     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_pagos_pedido ON pagos_procesados (pedido_id);

CREATE TABLE movimientos_stock (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  juego_id         uuid NOT NULL REFERENCES juegos(id) ON DELETE RESTRICT,
  tipo             tipo_movimiento_stock NOT NULL,
  cantidad_signada integer NOT NULL CHECK (cantidad_signada <> 0),
  motivo           motivo_ajuste_stock,                 -- obligatorio solo para 'ajuste'
  referencia       text,                                -- pedido_id | admin_id
  creado_en        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_mov_motivo CHECK (tipo <> 'ajuste' OR motivo IS NOT NULL)
);
CREATE INDEX ix_mov_stock_juego ON movimientos_stock (juego_id);

-- ═══════════════════════ BC4 · Logística ═══════════════════════
CREATE TABLE envios (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id               uuid NOT NULL UNIQUE REFERENCES pedidos(id) ON DELETE CASCADE,
  numero_tracking         text,
  origen                  origen_tracking,
  eventos                 jsonb,                         -- caché de eventos de tracking (CU-013)
  tracking_actualizado_en timestamptz,
  creado_en               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tabla_tarifas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zona            text NOT NULL,
  peso_min_gramos integer NOT NULL CHECK (peso_min_gramos >= 0),
  peso_max_gramos integer NOT NULL CHECK (peso_max_gramos > 0),
  precio          numeric(12,2) NOT NULL CHECK (precio >= 0),
  vigente         boolean NOT NULL DEFAULT true,
  CONSTRAINT ck_tarifa_rango CHECK (peso_max_gramos > peso_min_gramos)
);

-- ═══════════════════════ BC5 · Comprobantes ═══════════════════════
CREATE TABLE comprobantes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id  uuid NOT NULL REFERENCES pedidos(id) ON DELETE RESTRICT,   -- solo sobre pedido >= pagado (app)
  tipo       tipo_comprobante NOT NULL,
  cae        text,                                       -- solo si ARCA homologación
  pdf_ref    text,
  emitido_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_comprobantes_pedido ON comprobantes (pedido_id);

-- ═══════════════════════ BC6 · Comunidad ═══════════════════════
CREATE TABLE encuestas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        text NOT NULL,
  descripcion   text,
  estado        estado_encuesta NOT NULL DEFAULT 'borrador',
  vigente_desde date,
  vigente_hasta date,
  creado_en     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE preguntas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encuesta_id uuid NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
  orden       integer NOT NULL,
  tipo        tipo_pregunta NOT NULL,
  texto       text NOT NULL,
  obligatoria boolean NOT NULL DEFAULT false,
  opciones    jsonb,                                     -- para opción única/múltiple
  UNIQUE (encuesta_id, orden)
);

CREATE TABLE respuestas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encuesta_id uuid NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
  cuenta_id   uuid NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
  contenido   jsonb NOT NULL,
  creado_en   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (encuesta_id, cuenta_id)                        -- una por cuenta y encuesta (S-17, CU-014 E1)
);

CREATE TABLE propuestas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_id     uuid NOT NULL REFERENCES cuentas(id) ON DELETE RESTRICT,
  numero        text NOT NULL UNIQUE,
  titulo        text NOT NULL,
  descripcion   text NOT NULL,
  area          text NOT NULL,
  edad_objetivo text NOT NULL,
  adjunto_ref   text,
  estado        estado_propuesta NOT NULL DEFAULT 'recibida',
  mensaje_admin text,
  creado_en     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_propuestas_cuenta ON propuestas (cuenta_id);

-- ═══════════════════════ Plataforma (transversal) ═══════════════════════
CREATE TABLE outbox_emails (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id     text NOT NULL UNIQUE,                     -- idempotencia del worker (CU-E05)
  tipo         text NOT NULL,
  destinatario text NOT NULL,
  payload      jsonb NOT NULL,
  estado       estado_outbox NOT NULL DEFAULT 'pendiente',
  intentos     smallint NOT NULL DEFAULT 0,
  ultimo_error text,
  creado_en    timestamptz NOT NULL DEFAULT now(),
  procesado_en timestamptz
);
CREATE INDEX ix_outbox_pendiente ON outbox_emails (creado_en) WHERE estado <> 'enviado';

CREATE TABLE eventos_auditoria (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        text NOT NULL,
  sujeto_tipo text NOT NULL,
  sujeto_id   uuid,
  actor_id    uuid,
  datos       jsonb,
  ip          inet,
  creado_en   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_auditoria_sujeto ON eventos_auditoria (sujeto_tipo, sujeto_id);

CREATE TABLE descargas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_id  uuid REFERENCES cuentas(id) ON DELETE SET NULL,   -- NULL si anónima (CU-008)
  recurso_id uuid NOT NULL REFERENCES recursos(id) ON DELETE CASCADE,
  via        via_descarga NOT NULL,
  creado_en  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_descargas_recurso ON descargas (recurso_id);

-- ─────────────────────── FK cruzada diferida ───────────────────────
ALTER TABLE catalogo_institucional
  ADD CONSTRAINT fk_cat_inst_pedido
  FOREIGN KEY (origen_pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL;

-- ─────────────────── Append-only por trigger (NFR-S6) ───────────────────
-- Nota de implementación: se usa un trigger (portátil e independiente del rol) en
-- lugar de REVOKE de permisos, para que el invariante se cumpla y sea testeable
-- igual en Testcontainers (superusuario) y en Supabase. La capa de permisos por
-- rol de servicio se añade en el deploy (Etapa 1). Kardex y auditoría son
-- inmutables; el outbox admite UPDATE (el worker actualiza estado/intentos,
-- CU-E05) pero no DELETE.
CREATE OR REPLACE FUNCTION impedir_update_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'tabla append-only: % no permitido en %', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE OR REPLACE FUNCTION impedir_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'tabla sin borrado: DELETE no permitido en %', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER trg_auditoria_append BEFORE UPDATE OR DELETE ON eventos_auditoria
  FOR EACH ROW EXECUTE FUNCTION impedir_update_delete();
CREATE TRIGGER trg_kardex_append BEFORE UPDATE OR DELETE ON movimientos_stock
  FOR EACH ROW EXECUTE FUNCTION impedir_update_delete();
CREATE TRIGGER trg_outbox_nodelete BEFORE DELETE ON outbox_emails
  FOR EACH ROW EXECUTE FUNCTION impedir_delete();
