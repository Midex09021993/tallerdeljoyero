-- Autoriza logos comerciales con la misma pertenencia canónica que usa la sesión.
-- Causa raíz: algunos usuarios gerente resuelven su taller desde profiles.participante_id
-- mientras las políticas anteriores exigían exclusivamente participante_cuentas.
-- El dueño global puede gestionar cualquier identidad; el gerente solo la de su participante activo.

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
      from public.ecosistema_participantes ep
      where ep.id::text = split_part(name, '/', 1)
        and ep.estado = 'activo'
        and public.has_role((select auth.uid()), 'gerente'::app_role)
        and (
          exists (
            select 1
            from public.participante_cuentas pc
            where pc.user_id = (select auth.uid())
              and pc.participante_id = ep.id
              and pc.estado = 'activo'
          )
          or exists (
            select 1
            from public.profiles p
            where p.id = (select auth.uid())
              and p.participante_id = ep.id
              and coalesce(p.activo, true)
          )
        )
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
      from public.ecosistema_participantes ep
      where ep.id::text = split_part(name, '/', 1)
        and ep.estado = 'activo'
        and public.has_role((select auth.uid()), 'gerente'::app_role)
        and (
          exists (
            select 1
            from public.participante_cuentas pc
            where pc.user_id = (select auth.uid())
              and pc.participante_id = ep.id
              and pc.estado = 'activo'
          )
          or exists (
            select 1
            from public.profiles p
            where p.id = (select auth.uid())
              and p.participante_id = ep.id
              and coalesce(p.activo, true)
          )
        )
    )
  )
)
with check (
  bucket_id = 'identidades-comerciales'
  and (
    public.has_role((select auth.uid()), 'dueno'::app_role)
    or exists (
      select 1
      from public.ecosistema_participantes ep
      where ep.id::text = split_part(name, '/', 1)
        and ep.estado = 'activo'
        and public.has_role((select auth.uid()), 'gerente'::app_role)
        and (
          exists (
            select 1
            from public.participante_cuentas pc
            where pc.user_id = (select auth.uid())
              and pc.participante_id = ep.id
              and pc.estado = 'activo'
          )
          or exists (
            select 1
            from public.profiles p
            where p.id = (select auth.uid())
              and p.participante_id = ep.id
              and coalesce(p.activo, true)
          )
        )
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
      from public.ecosistema_participantes ep
      where ep.id::text = split_part(name, '/', 1)
        and ep.estado = 'activo'
        and public.has_role((select auth.uid()), 'gerente'::app_role)
        and (
          exists (
            select 1
            from public.participante_cuentas pc
            where pc.user_id = (select auth.uid())
              and pc.participante_id = ep.id
              and pc.estado = 'activo'
          )
          or exists (
            select 1
            from public.profiles p
            where p.id = (select auth.uid())
              and p.participante_id = ep.id
              and coalesce(p.activo, true)
          )
        )
    )
  )
);

commit;
