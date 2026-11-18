
-- Helper: personal interno (cualquier rol salvo cliente)
CREATE OR REPLACE FUNCTION public.es_interno(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role <> 'cliente'
  )
$$;
REVOKE ALL ON FUNCTION public.es_interno(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.es_interno(uuid) TO authenticated;

-- clientes
DROP POLICY IF EXISTS "clientes_select" ON public.clientes;
CREATE POLICY "clientes_select" ON public.clientes FOR SELECT TO authenticated
USING (public.es_interno(auth.uid()));

-- proyectos_joya
DROP POLICY IF EXISTS "proyectos_select" ON public.proyectos_joya;
CREATE POLICY "proyectos_select" ON public.proyectos_joya FOR SELECT TO authenticated
USING (public.es_interno(auth.uid()));

-- config_sistema
DROP POLICY IF EXISTS "config sistema ver" ON public.config_sistema;
CREATE POLICY "config sistema ver" ON public.config_sistema FOR SELECT TO authenticated
USING (public.es_interno(auth.uid()));

-- cotizaciones
DROP POLICY IF EXISTS "cotizaciones_select" ON public.cotizaciones;
CREATE POLICY "cotizaciones_select" ON public.cotizaciones FOR SELECT TO authenticated
USING (public.es_interno(auth.uid()) AND public.ve_sede(auth.uid(), sede_id));

-- cotizacion_detalles
DROP POLICY IF EXISTS "cotdet_select" ON public.cotizacion_detalles;
CREATE POLICY "cotdet_select" ON public.cotizacion_detalles FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.cotizaciones c
  WHERE c.id = cotizacion_detalles.cotizacion_id
    AND public.es_interno(auth.uid())
    AND public.ve_sede(auth.uid(), c.sede_id)
));

-- contrato_pagos
DROP POLICY IF EXISTS "contrato_pagos_select" ON public.contrato_pagos;
CREATE POLICY "contrato_pagos_select" ON public.contrato_pagos FOR SELECT TO authenticated
USING (
  public.es_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.contratos ct
    WHERE ct.id = contrato_pagos.contrato_id
      AND public.ve_sede(auth.uid(), ct.sede_id)
  )
);

DROP POLICY IF EXISTS "contrato_pagos_insert" ON public.contrato_pagos;
CREATE POLICY "contrato_pagos_insert" ON public.contrato_pagos FOR INSERT TO authenticated
WITH CHECK (
  public.es_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.contratos ct
    WHERE ct.id = contrato_pagos.contrato_id
      AND public.ve_sede(auth.uid(), ct.sede_id)
  )
);

-- Storage: archivos de pedidos scoped por sede del pedido
DROP POLICY IF EXISTS "pedidos archivos leer" ON storage.objects;
CREATE POLICY "pedidos archivos leer" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'pedidos' AND EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND public.ve_sede(auth.uid(), p.sede_id)
  )
);

DROP POLICY IF EXISTS "pedidos archivos subir" ON storage.objects;
CREATE POLICY "pedidos archivos subir" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pedidos' AND EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND public.ve_sede(auth.uid(), p.sede_id)
  )
);

DROP POLICY IF EXISTS "pedidos archivos actualizar" ON storage.objects;
CREATE POLICY "pedidos archivos actualizar" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'pedidos' AND EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND public.ve_sede(auth.uid(), p.sede_id)
  )
)
WITH CHECK (
  bucket_id = 'pedidos' AND EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND public.ve_sede(auth.uid(), p.sede_id)
  )
);

DROP POLICY IF EXISTS "pedidos archivos borrar" ON storage.objects;
CREATE POLICY "pedidos archivos borrar" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'pedidos' AND EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND public.ve_sede(auth.uid(), p.sede_id)
  )
);

-- Funciones SECURITY DEFINER: quitar acceso público/anónimo
REVOKE ALL ON FUNCTION public.guardar_detalles_cotizacion(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_detalles_cotizacion(uuid, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.cambiar_estado_cotizacion(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cambiar_estado_cotizacion(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.crear_version_cotizacion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_version_cotizacion(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.convertir_cotizacion_a_pedido_contrato(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convertir_cotizacion_a_pedido_contrato(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.seguimiento_pedido(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seguimiento_pedido(text) TO anon, authenticated;
