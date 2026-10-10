ALTER TABLE public.sedes ADD COLUMN IF NOT EXISTS zona_horaria text NOT NULL DEFAULT 'America/Lima';
COMMENT ON COLUMN public.sedes.zona_horaria IS 'Identificador IANA usado para mostrar fechas comerciales de la sede. Los instantes se guardan en UTC.';
CREATE OR REPLACE FUNCTION public.validar_zona_horaria_sede()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = NEW.zona_horaria) THEN
    RAISE EXCEPTION 'Zona horaria no válida: %', NEW.zona_horaria USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_validar_zona_horaria_sede ON public.sedes;
CREATE TRIGGER trg_validar_zona_horaria_sede BEFORE INSERT OR UPDATE OF zona_horaria ON public.sedes
FOR EACH ROW EXECUTE FUNCTION public.validar_zona_horaria_sede();