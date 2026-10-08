-- Reconciliación de RLS para logos comerciales.
-- El dueño global no depende de participante_cuentas para administrar identidades;
-- los gerentes siguen restringidos al participante propietario.

begin;

drop policy if exists "identidades comerciales subir logo" on storage.objects;
create policy "identidades comerciales subir logo"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'identidades-comerciales'
  and (
    public.has_role((select auth.uid()), 'dueno'::app_role)
    or exists (
      select 1
      from public.participante_cuentas pc
      join public.ecosistema_participantes ep on ep.id = pc.participante_id
      where pc.user_id = (select auth.uid())
        and pc.participante_id::text = split_part(name, '/', 1)
        and pc.estado = 'activo'
        and ep.estado = 'activo'
        and public.has_role((select auth.uid()), 'gerente'::app_role)
    )
  )
);

drop policy if exists "identidades comerciales actualizar logo" on storage.objects;
create policy "identidades comerciales actualizar logo"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'identidades-comerciales'
  and (
    public.has_role((select auth.uid()), 'dueno'::app_role)
    or exists (
      select 1
      from public.participante_cuentas pc
      join public.ecosistema_participantes ep on ep.id = pc.participante_id
      where pc.user_id = (select auth.uid())
        and pc.participante_id::text = split_part(name, '/', 1)
        and pc.estado = 'activo'
        and ep.estado = 'activo'
        and public.has_role((select auth.uid()), 'gerente'::app_role)
    )
  )
)
with check (
  bucket_id = 'identidades-comerciales'
  and (
    public.has_role((select auth.uid()), 'dueno'::app_role)
    or exists (
      select 1
      from public.participante_cuentas pc
      join public.ecosistema_participantes ep on ep.id = pc.participante_id
      where pc.user_id = (select auth.uid())
        and pc.participante_id::text = split_part(name, '/', 1)
        and pc.estado = 'activo'
        and ep.estado = 'activo'
        and public.has_role((select auth.uid()), 'gerente'::app_role)
    )
  )
);

drop policy if exists "identidades comerciales borrar logo" on storage.objects;
create policy "identidades comerciales borrar logo"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'identidades-comerciales'
  and (
    public.has_role((select auth.uid()), 'dueno'::app_role)
    or exists (
      select 1
      from public.participante_cuentas pc
      join public.ecosistema_participantes ep on ep.id = pc.participante_id
      where pc.user_id = (select auth.uid())
        and pc.participante_id::text = split_part(name, '/', 1)
        and pc.estado = 'activo'
        and ep.estado = 'activo'
        and public.has_role((select auth.uid()), 'gerente'::app_role)
    )
  )
);

commit;
