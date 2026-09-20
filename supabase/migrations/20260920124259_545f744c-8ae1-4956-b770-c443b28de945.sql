-- 1. contrato_pagos: non-admin inserts must be sede-scoped AND self-authored
DROP POLICY IF EXISTS contrato_pagos_insert ON public.contrato_pagos;
CREATE POLICY contrato_pagos_insert ON public.contrato_pagos
FOR INSERT TO authenticated
WITH CHECK (
  es_admin(auth.uid())
  OR (
    usuario_id = auth.uid()
    AND contrato_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.contratos ct
      WHERE ct.id = contrato_pagos.contrato_id
        AND ve_sede(auth.uid(), ct.sede_id)
    )
  )
);

-- 2. solicitudes_acceso: validate public intake
DROP POLICY IF EXISTS solicitudes_insert_publico ON public.solicitudes_acceso;
CREATE POLICY solicitudes_insert_publico ON public.solicitudes_acceso
FOR INSERT TO anon, authenticated
WITH CHECK (
  estado = 'pendiente'
  AND revisado_por IS NULL
  AND revisado_at IS NULL
  AND notas_owner IS NULL
  AND tipo_solicitante IN ('profesional', 'empresa', 'proveedor', 'cliente', 'taller')
  AND char_length(nombre) BETWEEN 2 AND 120
  AND char_length(email) BETWEEN 5 AND 160
  AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (empresa IS NULL OR char_length(empresa) <= 160)
  AND (documento IS NULL OR char_length(documento) <= 30)
  AND (telefono IS NULL OR char_length(telefono) <= 30)
  AND (ciudad IS NULL OR char_length(ciudad) <= 80)
  AND (descripcion IS NULL OR char_length(descripcion) <= 2000)
  AND array_length(especialidades, 1) IS DISTINCT FROM 0
  AND coalesce(array_length(especialidades, 1), 0) <= 20
);

-- 3. user_areas: scope gerente writes to own sede
DROP POLICY IF EXISTS "areas admin" ON public.user_areas;
CREATE POLICY "areas admin" ON public.user_areas
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'dueno'::app_role)
  OR (
    has_role(auth.uid(), 'gerente'::app_role)
    AND NOT has_role(user_id, 'dueno'::app_role)
    AND mi_sede(user_id) IS NOT NULL
    AND mi_sede(user_id) = mi_sede(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'dueno'::app_role)
  OR (
    has_role(auth.uid(), 'gerente'::app_role)
    AND NOT has_role(user_id, 'dueno'::app_role)
    AND mi_sede(user_id) IS NOT NULL
    AND mi_sede(user_id) = mi_sede(auth.uid())
  )
);