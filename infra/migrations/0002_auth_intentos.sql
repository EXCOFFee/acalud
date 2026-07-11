-- Migración 0002 · Ventana de intentos fallidos para el bloqueo por fuerza bruta (PA-02).
-- `intentos_desde` marca el inicio de la racha de fallos; si el próximo fallo llega > 15 min
-- después, la racha se reinicia (no se acumulan intentos viejos).
ALTER TABLE cuentas ADD COLUMN intentos_desde timestamptz;
