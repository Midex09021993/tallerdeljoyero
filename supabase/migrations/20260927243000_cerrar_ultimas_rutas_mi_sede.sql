-- Elimina las ultimas rutas de autorizacion basadas en mi_sede().
-- mi_sede queda solo como compatibilidad legacy; ninguna politica nueva
-- debe usarla para decidir acceso.

begin;

-- ============================================================
-- PLANTILLAS DE CONTRATO
-- ============================================================

drop policy if exists "plantillas contrato ver" on public.plantillas_contrato;
drop policy if exists "plantillas contrato gestionar" on public.plantillas_contrato;

create policy "plantillas contrato ver"
on public.plantillas_contrato
for select to authenticated
using (
  exists (
    select 1
    from public.identidades_comerciales ic
    where ic.id = plantillas_contrato.identidad_comercial_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or public.ve_sede((select auth.uid()), ic.sede_id)
      )
  )
);

create policy "plantillas contrato gestionar"
on public.plantillas_contrato
for all to authenticated
using (
  exists (
    select 1
    from public.identidades_comerciales ic
    where ic.id = plantillas_contrato.identidad_comercial_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and public.ve_sede((select auth.uid()), ic.sede_id)
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.identidades_comerciales ic
    where ic.id = plantillas_contrato.identidad_comercial_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and public.ve_sede((select auth.uid()), ic.sede_id)
        )
      )
  )
);

-- ============================================================
-- DOCUMENTOS DE CONTRATO
-- ============================================================

drop policy if exists "contrato documentos ver" on public.contrato_documentos;
drop policy if exists "contrato documentos gestionar" on public.contrato_documentos;

create policy "contrato documentos ver"
on public.contrato_documentos
for select to authenticated
using (
  exists (
    select 1
    from public.contratos c
    where c.id = contrato_documentos.contrato_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or public.ve_sede((select auth.uid()), c.sede_id)
      )
  )
);

create policy "contrato documentos gestionar"
on public.contrato_documentos
for all to authenticated
using (
  exists (
    select 1
    from public.contratos c
    where c.id = contrato_documentos.contrato_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and public.ve_sede((select auth.uid()), c.sede_id)
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.contratos c
    where c.id = contrato_documentos.contrato_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and public.ve_sede((select auth.uid()), c.sede_id)
        )
      )
  )
);

-- ============================================================
-- PEDIDO COMERCIAL
-- ============================================================

drop policy if exists "pedido_comercial select" on public.pedido_comercial;
drop policy if exists "pedido_comercial insert" on public.pedido_comercial;
drop policy if exists "pedido_comercial update" on public.pedido_comercial;
drop policy if exists "pedido_comercial delete" on public.pedido_comercial;

create policy "pedido_comercial select"
on public.pedido_comercial
for select to authenticated
using (
  exists (
    select 1
    from public.pedidos p
    where p.id = pedido_comercial.pedido_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or public.ve_sede((select auth.uid()), p.sede_id)
      )
  )
);

create policy "pedido_comercial insert"
on public.pedido_comercial
for insert to authenticated
with check (
  exists (
    select 1
    from public.pedidos p
    where p.id = pedido_comercial.pedido_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and public.ve_sede((select auth.uid()), p.sede_id)
        )
      )
  )
);

create policy "pedido_comercial update"
on public.pedido_comercial
for update to authenticated
using (
  exists (
    select 1
    from public.pedidos p
    where p.id = pedido_comercial.pedido_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and public.ve_sede((select auth.uid()), p.sede_id)
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.pedidos p
    where p.id = pedido_comercial.pedido_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and public.ve_sede((select auth.uid()), p.sede_id)
        )
      )
  )
);

create policy "pedido_comercial delete"
on public.pedido_comercial
for delete to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  and exists (
    select 1
    from public.pedidos p
    where p.id = pedido_comercial.pedido_id
      and public.ve_sede((select auth.uid()), p.sede_id)
  )
);

-- ============================================================
-- PROFILES / AREAS / ROLES
-- ============================================================

create or replace function private.es_dueno_usuario(_target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = _target_user_id
      and ur.role = 'dueno'::public.app_role
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and private.usuario_comparte_participante(_target_user_id)
        )
      )
  );
$$;

revoke all on function private.es_dueno_usuario(uuid) from public, anon, authenticated;
grant execute on function private.es_dueno_usuario(uuid) to authenticated;

drop policy if exists "perfiles borrar" on public.profiles;
create policy "perfiles borrar"
on public.profiles for delete to authenticated
using (
  id = (select auth.uid())
  or public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and private.usuario_comparte_participante(id)
    and not private.es_dueno_usuario(id)
  )
);

drop policy if exists "perfiles ver" on public.profiles;
create policy "perfiles ver"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and private.usuario_comparte_participante(id)
    and not private.es_dueno_usuario(id)
  )
);

drop policy if exists "perfiles editar" on public.profiles;
create policy "perfiles editar"
on public.profiles for update to authenticated
using (
  id = (select auth.uid())
  or public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and private.usuario_comparte_participante(id)
    and not private.es_dueno_usuario(id)
  )
)
with check (
  id = (select auth.uid())
  or public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and private.usuario_comparte_participante(id)
    and not private.es_dueno_usuario(id)
  )
);

drop policy if exists "areas ver" on public.user_areas;
create policy "areas ver"
on public.user_areas for select to authenticated
using (
  user_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and not private.es_dueno_usuario(user_id)
    and private.usuario_comparte_participante(user_id)
  )
);

drop policy if exists "roles ver" on public.user_roles;
create policy "roles ver"
on public.user_roles for select to authenticated
using (
  user_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and not private.es_dueno_usuario(user_id)
    and private.usuario_comparte_participante(user_id)
  )
);

commit;