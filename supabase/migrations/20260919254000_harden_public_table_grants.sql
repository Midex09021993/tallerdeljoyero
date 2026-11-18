-- Defense in depth for the exposed public schema.
-- RLS remains the authorization boundary; these grants remove unnecessary
-- table-level capabilities from browser roles.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', r.tablename);
    EXECUTE format('REVOKE REFERENCES, TRIGGER, TRUNCATE ON TABLE public.%I FROM authenticated', r.tablename);
  END LOOP;
END $$;

-- The anonymous access-request form intentionally needs INSERT only.
GRANT INSERT ON public.solicitudes_acceso TO anon;
