CREATE POLICY "pedidos archivos leer" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pedidos');
CREATE POLICY "pedidos archivos subir" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pedidos');
CREATE POLICY "pedidos archivos actualizar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'pedidos') WITH CHECK (bucket_id = 'pedidos');
CREATE POLICY "pedidos archivos borrar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pedidos');