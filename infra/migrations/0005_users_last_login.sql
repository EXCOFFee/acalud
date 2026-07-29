-- Migración 0005 · Instante del último acceso (addendum III)
--
-- Origen: CU-02, que nombra el campo de manera expresa en tres pasajes (flujo principal ×2 y
-- RN-003: "El campo last_login debe actualizarse en cada inicio de sesión exitoso"). El
-- esquema base lo había omitido.
--
-- Convive con `login_attempts`, que tiene otra finalidad: el registro audita los intentos y su
-- horizonte útil es de minutos (depurarlo es práctica habitual); esta columna informa el estado
-- de la cuenta y debe sobrevivir a esa depuración.

ALTER TABLE users ADD COLUMN last_login timestamptz;
