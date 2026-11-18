-- Ajusta RLS de config_sistema para evitar políticas SELECT duplicadas
-- y evaluación repetida de auth por fila.
DROP POLICY IF EXISTS "config sistema dueno" ON public.config_sistema;
DROP POLICY IF EXISTS "config sistema insertar dueno" ON public.config_sistema;
DROP POLICY IF EXISTS "config sistema actualizar dueno" ON public.config_sistema;
DROP POLICY IF EXISTS "config sistema eliminar dueno" ON public.config_sistema;

CREATE POLICY "config sistema insertar dueno" ON public.config_sistema
FOR INSERT TO authenticated
WITH CHECK ((select public.has_role(auth.uid(), 'dueno')));

CREATE POLICY "config sistema actualizar dueno" ON public.config_sistema
FOR UPDATE TO authenticated
USING ((select public.has_role(auth.uid(), 'dueno')))
WITH CHECK ((select public.has_role(auth.uid(), 'dueno')));

CREATE POLICY "config sistema eliminar dueno" ON public.config_sistema
FOR DELETE TO authenticated
USING ((select public.has_role(auth.uid(), 'dueno')));
