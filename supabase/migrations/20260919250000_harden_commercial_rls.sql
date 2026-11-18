-- Restrict commercial read access by role and sede.

DROP POLICY IF EXISTS "cotizaciones select" ON public.cotizaciones;
CREATE POLICY "cotizaciones select"
ON public.cotizaciones
FOR SELECT
TO authenticated
USING (
  has_role((select auth.uid()), 'dueno'::app_role)
  OR (
    has_role((select auth.uid()), 'gerente'::app_role)
    AND sede_id = mi_sede((select auth.uid()))
  )
);

DROP POLICY IF EXISTS "contrato_pagos select" ON public.contrato_pagos;
CREATE POLICY "contrato_pagos select"
ON public.contrato_pagos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.contratos c
    WHERE c.id = contrato_pagos.contrato_id
      AND (
        has_role((select auth.uid()), 'dueno'::app_role)
        OR (
          has_role((select auth.uid()), 'gerente'::app_role)
          AND c.sede_id = mi_sede((select auth.uid()))
        )
      )
  )
);

REVOKE ALL ON public.cotizaciones FROM anon;
REVOKE ALL ON public.contrato_pagos FROM anon;
