-- La interfaz ya muestra "Eliminar cliente" únicamente al Dueño.
-- Esta política garantiza el mismo control en la base de datos.

DROP POLICY IF EXISTS "clientes_admin_write" ON public.clientes;

CREATE POLICY "clientes_dueno_delete"
  ON public.clientes
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'dueno'::public.app_role));
