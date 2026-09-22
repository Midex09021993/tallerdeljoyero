-- Permite eliminar cotizaciones únicamente al dueño general.
-- Gerentes mantienen sus permisos administrativos de inserción/actualización,
-- pero no pueden borrar información comercial.

DROP POLICY IF EXISTS "cotizaciones_admin_write" ON public.cotizaciones;

CREATE POLICY "cotizaciones_admin_insert"
  ON public.cotizaciones
  FOR INSERT
  TO authenticated
  WITH CHECK (public.es_admin(auth.uid()));

CREATE POLICY "cotizaciones_admin_update"
  ON public.cotizaciones
  FOR UPDATE
  TO authenticated
  USING (public.es_admin(auth.uid()))
  WITH CHECK (public.es_admin(auth.uid()));

CREATE POLICY "cotizaciones_dueno_delete"
  ON public.cotizaciones
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'dueno'::public.app_role));
