-- Solo el Dueño general puede eliminar pedidos.
-- Los gerentes conservan la gestión operativa, pero no pueden borrar historial.

DROP POLICY IF EXISTS "pedidos borrar" ON public.pedidos;

CREATE POLICY "pedidos borrar solo dueno"
  ON public.pedidos
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'dueno'::public.app_role));
