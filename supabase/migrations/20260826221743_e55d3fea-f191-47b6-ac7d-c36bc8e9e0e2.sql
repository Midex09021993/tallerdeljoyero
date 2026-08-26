DROP POLICY IF EXISTS "perfil propio" ON public.profiles;
DROP POLICY IF EXISTS "editar perfil propio" ON public.profiles;
DROP POLICY IF EXISTS "perfiles borrar admin" ON public.profiles;

CREATE POLICY "perfiles ver" ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.has_role(auth.uid(), 'dueno')
  OR (
    public.has_role(auth.uid(), 'gerente')
    AND sede_id IS NOT NULL
    AND sede_id = public.mi_sede(auth.uid())
    AND NOT public.has_role(id, 'dueno')
  )
);

CREATE POLICY "perfiles editar" ON public.profiles FOR UPDATE TO authenticated
USING (
  id = auth.uid()
  OR public.has_role(auth.uid(), 'dueno')
  OR (
    public.has_role(auth.uid(), 'gerente')
    AND sede_id IS NOT NULL
    AND sede_id = public.mi_sede(auth.uid())
    AND NOT public.has_role(id, 'dueno')
  )
)
WITH CHECK (
  id = auth.uid()
  OR public.has_role(auth.uid(), 'dueno')
  OR (
    public.has_role(auth.uid(), 'gerente')
    AND sede_id IS NOT NULL
    AND sede_id = public.mi_sede(auth.uid())
    AND NOT public.has_role(id, 'dueno')
  )
);

CREATE POLICY "perfiles borrar" ON public.profiles FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'dueno')
  OR (
    public.has_role(auth.uid(), 'gerente')
    AND sede_id IS NOT NULL
    AND sede_id = public.mi_sede(auth.uid())
    AND NOT public.has_role(id, 'dueno')
  )
);

DROP POLICY IF EXISTS "roles propios" ON public.user_roles;
CREATE POLICY "roles ver" ON public.user_roles FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'dueno')
  OR (
    public.has_role(auth.uid(), 'gerente')
    AND NOT public.has_role(user_id, 'dueno')
    AND public.mi_sede(user_id) IS NOT NULL
    AND public.mi_sede(user_id) = public.mi_sede(auth.uid())
  )
);

DROP POLICY IF EXISTS "areas propias" ON public.user_areas;
CREATE POLICY "areas ver" ON public.user_areas FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'dueno')
  OR (
    public.has_role(auth.uid(), 'gerente')
    AND NOT public.has_role(user_id, 'dueno')
    AND public.mi_sede(user_id) IS NOT NULL
    AND public.mi_sede(user_id) = public.mi_sede(auth.uid())
  )
);