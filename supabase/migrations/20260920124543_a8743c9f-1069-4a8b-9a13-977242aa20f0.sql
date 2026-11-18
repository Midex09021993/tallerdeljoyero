DROP POLICY IF EXISTS solicitudes_insert_publico ON public.solicitudes_acceso;
CREATE POLICY solicitudes_insert_publico ON public.solicitudes_acceso
FOR INSERT TO anon, authenticated
WITH CHECK (
  estado = 'pendiente'
  AND revisado_por IS NULL
  AND revisado_at IS NULL
  AND notas_owner IS NULL
  AND tipo_solicitante IN ('taller', 'profesional', 'vendedor', 'proveedor', 'servicio')
  AND char_length(nombre) BETWEEN 2 AND 120
  AND char_length(email) BETWEEN 5 AND 160
  AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (empresa IS NULL OR char_length(empresa) <= 160)
  AND (documento IS NULL OR char_length(documento) <= 30)
  AND (telefono IS NULL OR char_length(telefono) <= 30)
  AND (ciudad IS NULL OR char_length(ciudad) <= 80)
  AND (descripcion IS NULL OR char_length(descripcion) <= 2000)
  AND coalesce(array_length(especialidades, 1), 0) <= 20
);