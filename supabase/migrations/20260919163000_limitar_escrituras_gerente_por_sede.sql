-- Limita las escrituras de gerentes a su propia sede.
-- El dueño mantiene administración global.

-- clientes
DROP POLICY IF EXISTS "clientes manage" ON public.clientes;
CREATE POLICY "clientes manage" ON public.clientes FOR INSERT TO authenticated WITH CHECK (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND sede_id = mi_sede((select auth.uid())))
);
DROP POLICY IF EXISTS "clientes update" ON public.clientes;
CREATE POLICY "clientes update" ON public.clientes FOR UPDATE TO authenticated USING (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND sede_id = mi_sede((select auth.uid())))
) WITH CHECK (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND sede_id = mi_sede((select auth.uid())))
);
DROP POLICY IF EXISTS "clientes delete" ON public.clientes;
CREATE POLICY "clientes delete" ON public.clientes FOR DELETE TO authenticated USING (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND sede_id = mi_sede((select auth.uid())))
);

-- contratos
DROP POLICY IF EXISTS "contratos insert" ON public.contratos;
CREATE POLICY "contratos insert" ON public.contratos FOR INSERT TO authenticated WITH CHECK (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND sede_id = mi_sede((select auth.uid())))
);
DROP POLICY IF EXISTS "contratos update" ON public.contratos;
CREATE POLICY "contratos update" ON public.contratos FOR UPDATE TO authenticated USING (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND sede_id = mi_sede((select auth.uid())))
) WITH CHECK (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND sede_id = mi_sede((select auth.uid())))
);
DROP POLICY IF EXISTS "contratos delete" ON public.contratos;
CREATE POLICY "contratos delete" ON public.contratos FOR DELETE TO authenticated USING (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND sede_id = mi_sede((select auth.uid())))
);

-- pagos de contratos: la sede se obtiene del contrato padre.
DROP POLICY IF EXISTS "contrato_pagos insert" ON public.contrato_pagos;
CREATE POLICY "contrato_pagos insert" ON public.contrato_pagos FOR INSERT TO authenticated WITH CHECK (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND EXISTS (
    SELECT 1 FROM public.contratos c
    WHERE c.id = contrato_pagos.contrato_id AND c.sede_id = mi_sede((select auth.uid()))
  ))
);
DROP POLICY IF EXISTS "contrato_pagos update" ON public.contrato_pagos;
CREATE POLICY "contrato_pagos update" ON public.contrato_pagos FOR UPDATE TO authenticated USING (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND EXISTS (
    SELECT 1 FROM public.contratos c
    WHERE c.id = contrato_pagos.contrato_id AND c.sede_id = mi_sede((select auth.uid()))
  ))
) WITH CHECK (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND EXISTS (
    SELECT 1 FROM public.contratos c
    WHERE c.id = contrato_pagos.contrato_id AND c.sede_id = mi_sede((select auth.uid()))
  ))
);
DROP POLICY IF EXISTS "contrato_pagos delete" ON public.contrato_pagos;
CREATE POLICY "contrato_pagos delete" ON public.contrato_pagos FOR DELETE TO authenticated USING (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND EXISTS (
    SELECT 1 FROM public.contratos c
    WHERE c.id = contrato_pagos.contrato_id AND c.sede_id = mi_sede((select auth.uid()))
  ))
);

-- cotizaciones
DROP POLICY IF EXISTS "cotizaciones insert" ON public.cotizaciones;
CREATE POLICY "cotizaciones insert" ON public.cotizaciones FOR INSERT TO authenticated WITH CHECK (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND sede_id = mi_sede((select auth.uid())))
);
DROP POLICY IF EXISTS "cotizaciones update" ON public.cotizaciones;
CREATE POLICY "cotizaciones update" ON public.cotizaciones FOR UPDATE TO authenticated USING (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND sede_id = mi_sede((select auth.uid())))
) WITH CHECK (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND sede_id = mi_sede((select auth.uid())))
);
DROP POLICY IF EXISTS "cotizaciones delete" ON public.cotizaciones;
CREATE POLICY "cotizaciones delete" ON public.cotizaciones FOR DELETE TO authenticated USING (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND sede_id = mi_sede((select auth.uid())))
);

-- detalles de cotización: sede heredada de la cotización padre.
DROP POLICY IF EXISTS "cotizacion_detalles insert" ON public.cotizacion_detalles;
CREATE POLICY "cotizacion_detalles insert" ON public.cotizacion_detalles FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.cotizaciones c WHERE c.id = cotizacion_detalles.cotizacion_id AND (
    has_role((select auth.uid()), 'dueno') OR
    (has_role((select auth.uid()), 'gerente') AND c.sede_id = mi_sede((select auth.uid())))
  ))
);
DROP POLICY IF EXISTS "cotizacion_detalles update" ON public.cotizacion_detalles;
CREATE POLICY "cotizacion_detalles update" ON public.cotizacion_detalles FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.cotizaciones c WHERE c.id = cotizacion_detalles.cotizacion_id AND (
    has_role((select auth.uid()), 'dueno') OR
    (has_role((select auth.uid()), 'gerente') AND c.sede_id = mi_sede((select auth.uid())))
  ))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.cotizaciones c WHERE c.id = cotizacion_detalles.cotizacion_id AND (
    has_role((select auth.uid()), 'dueno') OR
    (has_role((select auth.uid()), 'gerente') AND c.sede_id = mi_sede((select auth.uid())))
  ))
);
DROP POLICY IF EXISTS "cotizacion_detalles delete" ON public.cotizacion_detalles;
CREATE POLICY "cotizacion_detalles delete" ON public.cotizacion_detalles FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.cotizaciones c WHERE c.id = cotizacion_detalles.cotizacion_id AND (
    has_role((select auth.uid()), 'dueno') OR
    (has_role((select auth.uid()), 'gerente') AND c.sede_id = mi_sede((select auth.uid())))
  ))
);

-- identidades comerciales
DROP POLICY IF EXISTS "identidades comerciales insert" ON public.identidades_comerciales;
CREATE POLICY "identidades comerciales insert" ON public.identidades_comerciales FOR INSERT TO authenticated WITH CHECK (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND sede_id = mi_sede((select auth.uid())))
);
DROP POLICY IF EXISTS "identidades comerciales update" ON public.identidades_comerciales;
CREATE POLICY "identidades comerciales update" ON public.identidades_comerciales FOR UPDATE TO authenticated USING (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND sede_id = mi_sede((select auth.uid())))
) WITH CHECK (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND sede_id = mi_sede((select auth.uid())))
);
DROP POLICY IF EXISTS "identidades comerciales delete" ON public.identidades_comerciales;
CREATE POLICY "identidades comerciales delete" ON public.identidades_comerciales FOR DELETE TO authenticated USING (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND sede_id = mi_sede((select auth.uid())))
);

-- proyectos de joya
DROP POLICY IF EXISTS "proyectos_joya insert" ON public.proyectos_joya;
CREATE POLICY "proyectos_joya insert" ON public.proyectos_joya FOR INSERT TO authenticated WITH CHECK (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND sede_id = mi_sede((select auth.uid())))
);
DROP POLICY IF EXISTS "proyectos_joya update" ON public.proyectos_joya;
CREATE POLICY "proyectos_joya update" ON public.proyectos_joya FOR UPDATE TO authenticated USING (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND sede_id = mi_sede((select auth.uid())))
) WITH CHECK (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND sede_id = mi_sede((select auth.uid())))
);
DROP POLICY IF EXISTS "proyectos_joya delete" ON public.proyectos_joya;
CREATE POLICY "proyectos_joya delete" ON public.proyectos_joya FOR DELETE TO authenticated USING (
  has_role((select auth.uid()), 'dueno') OR
  (has_role((select auth.uid()), 'gerente') AND sede_id = mi_sede((select auth.uid())))
);
