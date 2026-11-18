-- 1) Enable RLS on cotizacion_numeradores (counters only written by SECURITY DEFINER function)
ALTER TABLE public.cotizacion_numeradores ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.cotizacion_numeradores FROM anon;
GRANT SELECT ON public.cotizacion_numeradores TO authenticated;
GRANT ALL ON public.cotizacion_numeradores TO service_role;

DROP POLICY IF EXISTS "numeradores leer personal sede" ON public.cotizacion_numeradores;
CREATE POLICY "numeradores leer personal sede"
ON public.cotizacion_numeradores
FOR SELECT
TO authenticated
USING (public.es_interno(auth.uid()) AND public.ve_sede(auth.uid(), sede_id));

-- 2) Storage write restrictions for cotizaciones-publicas
DROP POLICY IF EXISTS "cotizaciones publicas subir personal" ON storage.objects;
CREATE POLICY "cotizaciones publicas subir personal"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cotizaciones-publicas'
  AND EXISTS (
    SELECT 1 FROM public.cotizaciones c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND public.ve_sede(auth.uid(), c.sede_id)
      AND (public.es_admin(auth.uid()) OR public.es_interno(auth.uid()))
  )
);

DROP POLICY IF EXISTS "cotizaciones publicas actualizar personal" ON storage.objects;
CREATE POLICY "cotizaciones publicas actualizar personal"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cotizaciones-publicas'
  AND EXISTS (
    SELECT 1 FROM public.cotizaciones c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND public.ve_sede(auth.uid(), c.sede_id)
      AND public.es_admin(auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'cotizaciones-publicas'
  AND EXISTS (
    SELECT 1 FROM public.cotizaciones c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND public.ve_sede(auth.uid(), c.sede_id)
      AND public.es_admin(auth.uid())
  )
);

DROP POLICY IF EXISTS "cotizaciones publicas borrar admin" ON storage.objects;
CREATE POLICY "cotizaciones publicas borrar admin"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'cotizaciones-publicas'
  AND EXISTS (
    SELECT 1 FROM public.cotizaciones c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND public.ve_sede(auth.uid(), c.sede_id)
      AND public.es_admin(auth.uid())
  )
);