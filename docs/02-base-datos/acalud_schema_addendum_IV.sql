-- ============================================================================
--  SISTEMA ACALUD — Addendum IV
--  Motor: PostgreSQL 15+
--  Aplicar DESPUÉS de acalud_schema.sql y los addenda I, II y III
-- ============================================================================
--
--  JUSTIFICACIÓN
--
--  Este addendum incorpora columnas que las especificaciones requieren y que el
--  esquema base omitió. A diferencia de los addenda anteriores —que agregaban
--  estructuras de infraestructura no previstas por las especificaciones— aquí se
--  trata de atributos que las especificaciones nombran de manera expresa.
--
--  Se detectaron al contrastar el esquema con los formularios y las
--  enumeraciones de campos que los casos de uso describen.
--
-- ============================================================================


-- ----------------------------------------------------------------------------
--  1. IMAGEN DEL PRODUCTO
--
--  Origen: CU-19, formulario de alta de producto, que enumera entre sus campos:
--  "Imagen del producto (opcional, subida de archivo)".
--
--  El esquema base omitió el atributo pese a integrar la enumeración de campos
--  que el administrador completa.
-- ----------------------------------------------------------------------------

ALTER TABLE products ADD COLUMN image_url VARCHAR(500);


-- ----------------------------------------------------------------------------
--  2. PESO Y DIMENSIONES DEL PRODUCTO
--
--  Origen: CU-11, que los requiere para el cálculo del costo de envío:
--    · Flujo principal: "El sistema envía una solicitud al proveedor logístico
--      con los datos del carrito (peso total, dimensiones, origen, destino)."
--    · A5.1: "El backend consulta la tabla products para obtener peso y
--      dimensiones de los productos en el carrito."
--    · RN-002: "El costo de envío depende del código postal de destino, peso
--      total del pedido y dimensiones de los productos (si están disponibles)."
--
--  Sin estos atributos, el cálculo de envío que describe CU-11 no puede
--  ejecutarse: la especificación indica expresamente de dónde se obtienen.
--
--  Ambos admiten nulo, conforme al flujo alternativo A5, que contempla que
--  algunos productos carezcan de estos datos y prevé valores predeterminados y
--  el registro de una advertencia interna.
-- ----------------------------------------------------------------------------

ALTER TABLE products ADD COLUMN weight_grams INTEGER CHECK (weight_grams IS NULL OR weight_grams > 0);
ALTER TABLE products ADD COLUMN length_cm    INTEGER CHECK (length_cm    IS NULL OR length_cm    > 0);
ALTER TABLE products ADD COLUMN width_cm     INTEGER CHECK (width_cm     IS NULL OR width_cm     > 0);
ALTER TABLE products ADD COLUMN height_cm    INTEGER CHECK (height_cm    IS NULL OR height_cm    > 0);


-- ----------------------------------------------------------------------------
--  3. ATRIBUTOS DE LA INSTITUCIÓN
--
--  Origen: CU-23, paso 13 del flujo principal, que enumera taxativamente los
--  atributos con los que se crea el registro:
--
--    "El backend crea un nuevo registro en institutions con: legal_name,
--     tax_id, address, phone (o null), email, level (o null),
--     student_count (o null), created_at."
--
--  El esquema base contempló nombre legal, identificador tributario, correo,
--  domicilio y marca temporal, pero omitió el teléfono, el nivel educativo y la
--  cantidad de alumnos. Los tres admiten nulo, según la propia enumeración.
--
--  El nivel educativo se modela como referencia a la entidad `levels`, que el
--  esquema ya define como dato maestro, en lugar de como texto libre.
-- ----------------------------------------------------------------------------

ALTER TABLE institutions ADD COLUMN phone         VARCHAR(30);
ALTER TABLE institutions ADD COLUMN level_id      UUID REFERENCES levels(id) ON DELETE SET NULL;
ALTER TABLE institutions ADD COLUMN student_count INTEGER CHECK (student_count IS NULL OR student_count > 0);

CREATE INDEX idx_institutions_level ON institutions (level_id);


-- ============================================================================
--  NOTA SOBRE EL DOMICILIO INSTITUCIONAL
--
--  CU-23 nombra el domicilio como un atributo único ("address: dirección"). El
--  esquema lo descompone en calle, número, localidad, provincia y código
--  postal, conforme a la decisión D-29, ratificada por el equipo.
--
--  La descomposición se conserva: el código postal debe ser accesible de manera
--  independiente para el cálculo de envío que describe CU-11, lo que un
--  atributo único no permitiría sin análisis del texto.
-- ============================================================================


-- ============================================================================
--  NOTA SOBRE ATRIBUTOS AUSENTES DE MANERA DELIBERADA
--
--  Las especificaciones mencionan otros dos atributos que el esquema no
--  incorpora, en ambos casos por decisión ratificada:
--
--    · `vote_count` en las opciones de encuesta (CU-14). Decisión D-47: el
--      recuento se calcula en tiempo de consulta sobre `poll_responses`.
--
--    · `item_type` e `item_id` en los favoritos (CU-18). Decisión D-14: la
--      referencia polimórfica se modela con tres columnas de clave foránea que
--      admiten nulo, con una restricción que exige exactamente una no nula.
--
--  No corresponde incorporarlos.
-- ============================================================================


-- ============================================================================
--  NOTA SOBRE `target_age`
--
--  La primera versión del sistema contempla un atributo de edad objetivo en los
--  productos. Ninguna especificación lo requiere, y CU-19 enumera de manera
--  cerrada los campos que el administrador completa al dar de alta un producto
--  —título, descripción, precio, existencias, categoría, marca, descuento
--  mayorista e imagen— sin incluirlo.
--
--  Corresponde retirarlo, junto con su exhibición en la interfaz. La
--  segmentación pedagógica del catálogo, de requerirse en el futuro, dispone de
--  la entidad `levels` como referencia.
-- ============================================================================


-- ============================================================================
--  FIN DEL ADDENDUM IV
--
--  Resumen: 8 columnas incorporadas, 1 índice, 1 atributo a retirar.
-- ============================================================================
