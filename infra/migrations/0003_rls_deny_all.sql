-- Migración 0003 · RLS deny-all en todo `public` (ADR-003, defensa en profundidad).
-- Supabase puede exponer las tablas de `public` por la Data API a los roles anon/authenticated;
-- habilitar RLS SIN políticas deja esas tablas inaccesibles para ellos (deny-all). El backend
-- se conecta como el rol de servicio (owner), que hace bypass de RLS, así que la app no cambia.
-- Nota: las tablas que agreguen migraciones futuras deben habilitar RLS en su propia migración.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t.tablename);
  END LOOP;
END $$;
