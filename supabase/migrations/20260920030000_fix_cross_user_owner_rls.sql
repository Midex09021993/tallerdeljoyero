-- Fix cross-user owner checks after hardening has_role to self-only access.
-- Manager policies need a safe internal lookup to protect owner accounts.

create schema if not exists private;

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
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = _target_user_id
      and ur.role = 'dueno'::public.app_role
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and p.sede_id is not null
          and p.sede_id = public.mi_sede((select auth.uid()))
        )
      )
  );
$$;

revoke execute on function private.es_dueno_usuario(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.es_dueno_usuario(uuid) to authenticated;

drop policy if exists "perfiles borrar" on public.profiles;
create policy "perfiles borrar"
on public.profiles for delete
to authenticated
using (
  (id = (select auth.uid()))
  or public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and sede_id is not null
    and sede_id = public.mi_sede((select auth.uid()))
    and not private.es_dueno_usuario(id)
  )
);

drop policy if exists "perfiles ver" on public.profiles;
create policy "perfiles ver"
on public.profiles for select
to authenticated
using (
  (id = (select auth.uid()))
  or public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and sede_id is not null
    and sede_id = public.mi_sede((select auth.uid()))
    and not private.es_dueno_usuario(id)
  )
);

drop policy if exists "perfiles editar" on public.profiles;
create policy "perfiles editar"
on public.profiles for update
to authenticated
using (
  (id = (select auth.uid()))
  or public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and sede_id is not null
    and sede_id = public.mi_sede((select auth.uid()))
    and not private.es_dueno_usuario(id)
  )
)
with check (
  (id = (select auth.uid()))
  or public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and sede_id is not null
    and sede_id = public.mi_sede((select auth.uid()))
    and not private.es_dueno_usuario(id)
  )
);

drop policy if exists "areas ver" on public.user_areas;
create policy "areas ver"
on public.user_areas for select
to authenticated
using (
  (user_id = (select auth.uid()))
  or public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and not private.es_dueno_usuario(user_id)
    and public.mi_sede(user_id) is not null
    and public.mi_sede(user_id) = public.mi_sede((select auth.uid()))
  )
);

drop policy if exists "roles ver" on public.user_roles;
create policy "roles ver"
on public.user_roles for select
to authenticated
using (
  (user_id = (select auth.uid()))
  or public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and not private.es_dueno_usuario(user_id)
    and public.mi_sede(user_id) is not null
    and public.mi_sede(user_id) = public.mi_sede((select auth.uid()))
  )
);
