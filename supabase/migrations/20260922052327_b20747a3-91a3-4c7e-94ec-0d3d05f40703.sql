DROP POLICY IF EXISTS clientes_admin_write ON public.clientes;
CREATE POLICY clientes_admin_write ON public.clientes FOR ALL TO authenticated
USING (es_admin(auth.uid()) AND ve_sede(auth.uid(), sede_id))
WITH CHECK (es_admin(auth.uid()) AND ve_sede(auth.uid(), sede_id));

DROP POLICY IF EXISTS cotizaciones_admin_write ON public.cotizaciones;
CREATE POLICY cotizaciones_admin_write ON public.cotizaciones FOR ALL TO authenticated
USING (es_admin(auth.uid()) AND ve_sede(auth.uid(), sede_id))
WITH CHECK (es_admin(auth.uid()) AND ve_sede(auth.uid(), sede_id));

DROP POLICY IF EXISTS cotdet_admin_write ON public.cotizacion_detalles;
CREATE POLICY cotdet_admin_write ON public.cotizacion_detalles FOR ALL TO authenticated
USING (es_admin(auth.uid()) AND EXISTS (
  SELECT 1 FROM public.cotizaciones c
  WHERE c.id = cotizacion_detalles.cotizacion_id AND ve_sede(auth.uid(), c.sede_id)))
WITH CHECK (es_admin(auth.uid()) AND EXISTS (
  SELECT 1 FROM public.cotizaciones c
  WHERE c.id = cotizacion_detalles.cotizacion_id AND ve_sede(auth.uid(), c.sede_id)));

DROP POLICY IF EXISTS "identidades comerciales gestionar" ON public.identidades_comerciales;
CREATE POLICY "identidades comerciales gestionar" ON public.identidades_comerciales FOR ALL TO authenticated
USING (has_role(auth.uid(), 'dueno') OR (has_role(auth.uid(), 'gerente') AND sede_id = mi_sede(auth.uid())))
WITH CHECK (has_role(auth.uid(), 'dueno') OR (has_role(auth.uid(), 'gerente') AND sede_id = mi_sede(auth.uid())));

DROP POLICY IF EXISTS proyectos_admin_write ON public.proyectos_joya;
CREATE POLICY proyectos_admin_write ON public.proyectos_joya FOR ALL TO authenticated
USING (
  es_admin(auth.uid())
  AND NOT EXISTS (SELECT 1 FROM public.pedidos p WHERE p.proyecto_joya_id = proyectos_joya.id AND NOT ve_sede(auth.uid(), p.sede_id))
  AND NOT EXISTS (SELECT 1 FROM public.cotizaciones c WHERE c.proyecto_joya_id = proyectos_joya.id AND NOT ve_sede(auth.uid(), c.sede_id))
)
WITH CHECK (
  es_admin(auth.uid())
  AND NOT EXISTS (SELECT 1 FROM public.pedidos p WHERE p.proyecto_joya_id = proyectos_joya.id AND NOT ve_sede(auth.uid(), p.sede_id))
  AND NOT EXISTS (SELECT 1 FROM public.cotizaciones c WHERE c.proyecto_joya_id = proyectos_joya.id AND NOT ve_sede(auth.uid(), c.sede_id))
);

DROP POLICY IF EXISTS trabajos_admin_write ON public.trabajos;
CREATE POLICY trabajos_admin_write ON public.trabajos FOR ALL TO authenticated
USING (es_admin(auth.uid()) AND ve_sede(auth.uid(), sede_id))
WITH CHECK (es_admin(auth.uid()) AND ve_sede(auth.uid(), sede_id));