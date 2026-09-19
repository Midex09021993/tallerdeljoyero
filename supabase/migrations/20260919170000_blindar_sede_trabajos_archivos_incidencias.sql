-- Blindaje de sede en trabajos, archivos e incidencias.
-- Evita acceso cruzado por responsable/participante sin validar sede.

DROP POLICY IF EXISTS "trabajos_select_operativo" ON public.trabajos;
CREATE POLICY "trabajos_select_operativo" ON public.trabajos FOR SELECT TO authenticated USING (
  es_admin((select auth.uid())) OR (
    sede_id IS NOT NULL AND ve_sede((select auth.uid()), sede_id) AND (
      responsable_user_id = (select auth.uid()) OR EXISTS (
        SELECT 1 FROM participante_cuentas pc WHERE pc.participante_id = trabajos.participante_id
        AND pc.user_id = (select auth.uid()) AND pc.estado = 'activo'
      )
    )
  )
);

DROP POLICY IF EXISTS "trabajos_select_supervision" ON public.trabajos;
CREATE POLICY "trabajos_select_supervision" ON public.trabajos FOR SELECT TO authenticated USING (
  es_admin((select auth.uid())) OR (
    sede_id IS NOT NULL AND ve_sede((select auth.uid()), sede_id) AND (
      responsable_user_id = (select auth.uid()) OR
      EXISTS (SELECT 1 FROM participante_cuentas pc WHERE pc.participante_id = trabajos.participante_id
        AND pc.user_id = (select auth.uid()) AND pc.estado = 'activo') OR
      has_role((select auth.uid()), 'monitor')
    )
  )
);

DROP POLICY IF EXISTS "trabajos_update" ON public.trabajos;
CREATE POLICY "trabajos_update" ON public.trabajos FOR UPDATE TO authenticated
USING (es_admin((select auth.uid())) OR (
  responsable_user_id = (select auth.uid()) AND sede_id IS NOT NULL AND ve_sede((select auth.uid()), sede_id)
))
WITH CHECK (es_admin((select auth.uid())) OR (
  responsable_user_id = (select auth.uid()) AND sede_id IS NOT NULL AND ve_sede((select auth.uid()), sede_id)
));

DROP POLICY IF EXISTS "trabajo_archivos_select_asignado" ON public.trabajo_archivos;
CREATE POLICY "trabajo_archivos_select_asignado" ON public.trabajo_archivos FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM trabajos t WHERE t.id = trabajo_archivos.trabajo_id AND (
    es_admin((select auth.uid())) OR (
      t.sede_id IS NOT NULL AND ve_sede((select auth.uid()), t.sede_id) AND (
        t.responsable_user_id = (select auth.uid()) OR EXISTS (
          SELECT 1 FROM participante_cuentas pc WHERE pc.participante_id = t.participante_id
          AND pc.user_id = (select auth.uid()) AND pc.estado = 'activo'
        )
      )
    )
  ))
);

DROP POLICY IF EXISTS "incidencias_trabajo_select" ON public.incidencias_trabajo;
CREATE POLICY "incidencias_trabajo_select" ON public.incidencias_trabajo FOR SELECT TO authenticated USING (
  es_admin((select auth.uid())) OR reportado_por = (select auth.uid()) OR EXISTS (
    SELECT 1 FROM trabajos t WHERE t.id = incidencias_trabajo.trabajo_id
    AND t.sede_id IS NOT NULL AND ve_sede((select auth.uid()), t.sede_id) AND (
      t.responsable_user_id = (select auth.uid()) OR EXISTS (
        SELECT 1 FROM participante_cuentas pc WHERE pc.participante_id = t.participante_id
        AND pc.user_id = (select auth.uid()) AND pc.estado = 'activo'
      )
    )
  )
);

DROP POLICY IF EXISTS "incidencias_select_supervision" ON public.incidencias_trabajo;
CREATE POLICY "incidencias_select_supervision" ON public.incidencias_trabajo FOR SELECT TO authenticated USING (
  es_admin((select auth.uid())) OR reportado_por = (select auth.uid()) OR EXISTS (
    SELECT 1 FROM trabajos t WHERE t.id = incidencias_trabajo.trabajo_id
    AND t.sede_id IS NOT NULL AND ve_sede((select auth.uid()), t.sede_id) AND (
      t.responsable_user_id = (select auth.uid()) OR
      EXISTS (SELECT 1 FROM participante_cuentas pc WHERE pc.participante_id = t.participante_id
        AND pc.user_id = (select auth.uid()) AND pc.estado = 'activo') OR
      has_role((select auth.uid()), 'monitor')
    )
  )
);

DROP POLICY IF EXISTS "incidencias_trabajo_insert" ON public.incidencias_trabajo;
CREATE POLICY "incidencias_trabajo_insert" ON public.incidencias_trabajo FOR INSERT TO authenticated WITH CHECK (
  reportado_por = (select auth.uid()) AND EXISTS (
    SELECT 1 FROM trabajos t WHERE t.id = incidencias_trabajo.trabajo_id
    AND t.sede_id IS NOT NULL AND ve_sede((select auth.uid()), t.sede_id) AND (
      es_admin((select auth.uid())) OR t.responsable_user_id = (select auth.uid()) OR EXISTS (
        SELECT 1 FROM participante_cuentas pc WHERE pc.participante_id = t.participante_id
        AND pc.user_id = (select auth.uid()) AND pc.estado = 'activo'
      )
    )
  )
);