ALTER TABLE public.cotizaciones
  ALTER COLUMN seguimiento_codigo SET DEFAULT upper(substr(md5(gen_random_uuid()::text), 1, 20));

ALTER TABLE public.cotizaciones
  DROP CONSTRAINT IF EXISTS cotizaciones_seguimiento_codigo_formato_check;

ALTER TABLE public.cotizaciones
  ADD CONSTRAINT cotizaciones_seguimiento_codigo_formato_check
  CHECK (seguimiento_codigo ~ '^[0-9A-F]{20,64}$');