-- Códigos públicos de cotización más largos (80 bits) para que no puedan adivinarse.
ALTER TABLE public.cotizaciones
  ALTER COLUMN seguimiento_codigo SET DEFAULT upper(substr(md5(gen_random_uuid()::text), 1, 20));

-- Rotar los códigos cortos existentes (8 caracteres), que eran adivinables.
UPDATE public.cotizaciones
   SET seguimiento_codigo = upper(substr(md5(gen_random_uuid()::text), 1, 20))
 WHERE seguimiento_codigo !~ '^[A-F0-9]{20}$';

ALTER TABLE public.cotizaciones
  DROP CONSTRAINT IF EXISTS cotizaciones_seguimiento_codigo_seguro_check;
ALTER TABLE public.cotizaciones
  ADD CONSTRAINT cotizaciones_seguimiento_codigo_seguro_check
  CHECK (seguimiento_codigo ~ '^[A-F0-9]{20}$');