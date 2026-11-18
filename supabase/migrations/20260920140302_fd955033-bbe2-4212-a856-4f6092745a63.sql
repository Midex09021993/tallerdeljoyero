DROP POLICY IF EXISTS "config sistema ver" ON public.config_sistema;
CREATE POLICY "config sistema ver" ON public.config_sistema
FOR SELECT TO authenticated
USING (
  es_admin(auth.uid())
  OR (es_interno(auth.uid()) AND (clave LIKE 'calculadora_%' OR clave LIKE 'conversor_%'))
);

DROP POLICY IF EXISTS "clientes_select" ON public.clientes;
CREATE POLICY "clientes_select" ON public.clientes
FOR SELECT TO authenticated
USING (
  es_admin(auth.uid())
  OR (
    es_interno(auth.uid()) AND (
      EXISTS (SELECT 1 FROM public.pedidos p WHERE p.cliente_id = clientes.id AND ve_sede(auth.uid(), p.sede_id))
      OR EXISTS (SELECT 1 FROM public.cotizaciones c WHERE c.cliente_id = clientes.id AND ve_sede(auth.uid(), c.sede_id))
    )
  )
);

DROP POLICY IF EXISTS "proyectos_select" ON public.proyectos_joya;
CREATE POLICY "proyectos_select" ON public.proyectos_joya
FOR SELECT TO authenticated
USING (
  es_admin(auth.uid())
  OR (
    es_interno(auth.uid()) AND (
      EXISTS (SELECT 1 FROM public.pedidos p WHERE p.proyecto_joya_id = proyectos_joya.id AND ve_sede(auth.uid(), p.sede_id))
      OR EXISTS (SELECT 1 FROM public.cotizaciones c WHERE c.proyecto_joya_id = proyectos_joya.id AND ve_sede(auth.uid(), c.sede_id))
    )
  )
);