-- Keep commercial and customer-related reads scoped to the manager's sede.

DROP POLICY IF EXISTS "clientes select" ON public.clientes;
CREATE POLICY "clientes select"
ON public.clientes FOR SELECT TO authenticated
USING (
  has_role((select auth.uid()), 'dueno'::app_role)
  OR (
    has_role((select auth.uid()), 'gerente'::app_role)
    AND sede_id = mi_sede((select auth.uid()))
  )
);

DROP POLICY IF EXISTS "cotizacion_detalles select" ON public.cotizacion_detalles;
CREATE POLICY "cotizacion_detalles select"
ON public.cotizacion_detalles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.cotizaciones c
    WHERE c.id = cotizacion_detalles.cotizacion_id
      AND (
        has_role((select auth.uid()), 'dueno'::app_role)
        OR (
          has_role((select auth.uid()), 'gerente'::app_role)
          AND c.sede_id = mi_sede((select auth.uid()))
        )
      )
  )
);

DROP POLICY IF EXISTS "proyectos_joya select" ON public.proyectos_joya;
CREATE POLICY "proyectos_joya select"
ON public.proyectos_joya FOR SELECT TO authenticated
USING (
  has_role((select auth.uid()), 'dueno'::app_role)
  OR (
    has_role((select auth.uid()), 'gerente'::app_role)
    AND sede_id = mi_sede((select auth.uid()))
  )
);
