-- Hardening: limitar a gerente al participante/sede propio.
-- FADILAB mantiene acceso global mediante rol dueno.
-- Aplicado en Supabase como migration hardening_gerente_scope_20260927.

drop policy if exists "trabajos_admin_write" on public.trabajos;
create policy "trabajos_admin_write"
on public.trabajos
for all to authenticated
using (
  has_role((select auth.uid()), 'dueno'::app_role)
  or (has_role((select auth.uid()), 'gerente'::app_role) and ve_sede((select auth.uid()), sede_id))
)
with check (
  has_role((select auth.uid()), 'dueno'::app_role)
  or (has_role((select auth.uid()), 'gerente'::app_role) and ve_sede((select auth.uid()), sede_id))
);

drop policy if exists "trabajos_select" on public.trabajos;
create policy "trabajos_select"
on public.trabajos
for select to authenticated
using (
  has_role((select auth.uid()), 'dueno'::app_role)
  or (has_role((select auth.uid()), 'gerente'::app_role) and ve_sede((select auth.uid()), sede_id))
  or (responsable_user_id = (select auth.uid()) and ve_sede((select auth.uid()), sede_id))
);

drop policy if exists "incidencias_trabajo_all" on public.incidencias_trabajo;
create policy "incidencias_trabajo_all"
on public.incidencias_trabajo
for all to authenticated
using (
  exists (
    select 1 from public.trabajos t
    where t.id = incidencias_trabajo.trabajo_id
      and (
        has_role((select auth.uid()), 'dueno'::app_role)
        or (has_role((select auth.uid()), 'gerente'::app_role) and ve_sede((select auth.uid()), t.sede_id))
        or (t.responsable_user_id = (select auth.uid()) and ve_sede((select auth.uid()), t.sede_id))
      )
  )
)
with check (
  exists (
    select 1 from public.trabajos t
    where t.id = incidencias_trabajo.trabajo_id
      and (
        has_role((select auth.uid()), 'dueno'::app_role)
        or (has_role((select auth.uid()), 'gerente'::app_role) and ve_sede((select auth.uid()), t.sede_id))
        or (t.responsable_user_id = (select auth.uid()) and ve_sede((select auth.uid()), t.sede_id))
      )
  )
);

drop policy if exists "trabajo_archivos_all" on public.trabajo_archivos;
create policy "trabajo_archivos_all"
on public.trabajo_archivos
for all to authenticated
using (
  exists (
    select 1 from public.trabajos t
    where t.id = trabajo_archivos.trabajo_id
      and (
        has_role((select auth.uid()), 'dueno'::app_role)
        or (has_role((select auth.uid()), 'gerente'::app_role) and ve_sede((select auth.uid()), t.sede_id))
        or (t.responsable_user_id = (select auth.uid()) and ve_sede((select auth.uid()), t.sede_id))
      )
  )
)
with check (
  exists (
    select 1 from public.trabajos t
    where t.id = trabajo_archivos.trabajo_id
      and (
        has_role((select auth.uid()), 'dueno'::app_role)
        or (has_role((select auth.uid()), 'gerente'::app_role) and ve_sede((select auth.uid()), t.sede_id))
        or (t.responsable_user_id = (select auth.uid()) and ve_sede((select auth.uid()), t.sede_id))
      )
  )
);

drop policy if exists "areas admin" on public.user_areas;
create policy "areas admin"
on public.user_areas
for all to authenticated
using (
  has_role((select auth.uid()), 'dueno'::app_role)
  or (
    has_role((select auth.uid()), 'gerente'::app_role)
    and private.usuario_comparte_participante(user_id)
    and not private.es_dueno_usuario(user_id)
  )
)
with check (
  has_role((select auth.uid()), 'dueno'::app_role)
  or (
    has_role((select auth.uid()), 'gerente'::app_role)
    and private.usuario_comparte_participante(user_id)
    and not private.es_dueno_usuario(user_id)
  )
);

drop policy if exists "roles admin" on public.user_roles;
create policy "roles admin"
on public.user_roles
for all to authenticated
using (has_role((select auth.uid()), 'dueno'::app_role))
with check (has_role((select auth.uid()), 'dueno'::app_role));

drop policy if exists "perfiles admin" on public.profiles;
create policy "perfiles admin"
on public.profiles
for insert to authenticated
with check (
  has_role((select auth.uid()), 'dueno'::app_role)
  or (
    has_role((select auth.uid()), 'gerente'::app_role)
    and participante_id is not null
    and tiene_participante((select auth.uid()), participante_id)
  )
);
