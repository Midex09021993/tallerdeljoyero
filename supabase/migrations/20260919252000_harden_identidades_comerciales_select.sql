-- Restrict commercial identity reads by role and sede.
DROP POLICY IF EXISTS "identidades comerciales select" ON public.identidades_comerciales;
CREATE POLICY "identidades comerciales select"
ON public.identidades_comerciales
FOR SELECT
TO authenticated
USING (
  has_role((select auth.uid()), 'dueno'::app_role)
  OR (
    has_role((select auth.uid()), 'gerente'::app_role)
    AND sede_id = mi_sede((select auth.uid()))
  )
);
