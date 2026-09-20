DROP POLICY IF EXISTS "op crear operativo" ON public.ordenes_produccion;
CREATE POLICY "op crear operativo" ON public.ordenes_produccion
FOR INSERT TO authenticated
WITH CHECK (
  ve_sede(auth.uid(), sede_id)
  AND (es_admin(auth.uid()) OR has_role(auth.uid(), 'operario'::app_role) OR has_role(auth.uid(), 'monitor'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = ordenes_produccion.pedido_id
      AND p.sede_id = ordenes_produccion.sede_id
  )
);