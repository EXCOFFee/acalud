-- ============================================================================
-- INICIALIZACIÓN DE BASE DE DATOS - ACALUD
-- ============================================================================
-- Script para crear la base de datos y configuración inicial

-- Crear base de datos si no existe
SELECT 'CREATE DATABASE acalud_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'acalud_db')\gexec

-- Conectar a la base de datos
\c acalud_db;

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Función para generar UUID v4
CREATE OR REPLACE FUNCTION generate_uuid()
RETURNS UUID AS $$
BEGIN
    RETURN uuid_generate_v4();
END;
$$ LANGUAGE plpgsql;

-- Función para timestamp automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Configuración de timezone
SET timezone = 'UTC';

-- Configuración de logging
SET log_statement = 'all';
SET log_duration = on;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Base de datos AcaLud inicializada correctamente';
    RAISE NOTICE 'Timezone configurado a UTC';
    RAISE NOTICE 'Extensiones UUID y pgcrypto habilitadas';
END $$;
