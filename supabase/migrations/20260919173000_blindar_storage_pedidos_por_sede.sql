-- Aísla el bucket de archivos de pedidos por sede.
-- Las rutas actuales usan: <pedido_id>/<tipo>-<timestamp>-<nombre>.
-- Por ello la sede se resuelve desde el primer segmento de la ruta.

DROP POLICY IF EXISTS "pedidos archivos leer" ON storage.objects;
CREATE POLICY "pedidos archivos leer" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'pedidos' AND EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = nullif(split_part(name,'/',1),'')::uuid
      AND public.ve_sede((select auth.uid()), p.sede_id)
  )
);

DROP POLICY IF EXISTS "pedidos archivos subir" ON storage.objects;
CREATE POLICY "pedidos archivos subir" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'pedidos' AND EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = nullif(split_part(name,'/',1),'')::uuid
      AND public.ve_sede((select auth.uid()), p.sede_id)
  ) AND (
    public.es_admin((select auth.uid())) OR
    public.has_role((select auth.uid()), 'operario') OR
    public.has_role((select auth.uid()), 'monitor')
  )
);

DROP POLICY IF EXISTS "pedidos archivos actualizar" ON storage.objects;
CREATE POLICY "pedidos archivos actualizar" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'pedidos' AND EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = nullif(split_part(name,'/',1),'')::uuid
      AND public.ve_sede((select auth.uid()), p.sede_id)
  ) AND (
    public.es_admin((select auth.uid())) OR
    public.has_role((select auth.uid()), 'operario') OR
    public.has_role((select auth.uid()), 'monitor')
  )
) WITH CHECK (
  bucket_id = 'pedidos' AND EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = nullif(split_part(name,'/',1),'')::uuid
      AND public.ve_sede((select auth.uid()), p.sede_id)
  ) AND (
    public.es_admin((select auth.uid())) OR
    public.has_role((select auth.uid()), 'operario') OR
    public.has_role((select auth.uid()), 'monitor')
  )
);

DROP POLICY IF EXISTS "pedidos archivos borrar" ON storage.objects;
CREATE POLICY "pedidos archivos borrar" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'pedidos' AND public.es_admin((select auth.uid())) AND EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = nullif(split_part(name,'/',1),'')::uuid
      AND public.ve_sede((select auth.uid()), p.sede_id)
  )
);