-- Almacenamiento propio para logos de identidad comercial.
-- Los logos son activos públicos de marca, pero la escritura queda limitada
-- al administrador del taller propietario.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'identidades-comerciales',
  'identidades-comerciales',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "identidades comerciales subir logo" on storage.objects;
create policy "identidades comerciales subir logo"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'identidades-comerciales'
  and exists (
    select 1
    from public.participante_cuentas pc
    join public.ecosistema_participantes ep on ep.id = pc.participante_id
    where pc.user_id = (select auth.uid())
      and pc.participante_id::text = split_part(name, '/', 1)
      and pc.estado = 'activo'
      and ep.estado = 'activo'
      and public.es_admin((select auth.uid()))
  )
);

drop policy if exists "identidades comerciales actualizar logo" on storage.objects;
create policy "identidades comerciales actualizar logo"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'identidades-comerciales'
  and exists (
    select 1
    from public.participante_cuentas pc
    join public.ecosistema_participantes ep on ep.id = pc.participante_id
    where pc.user_id = (select auth.uid())
      and pc.participante_id::text = split_part(name, '/', 1)
      and pc.estado = 'activo'
      and ep.estado = 'activo'
      and public.es_admin((select auth.uid()))
  )
)
with check (
  bucket_id = 'identidades-comerciales'
  and exists (
    select 1
    from public.participante_cuentas pc
    join public.ecosistema_participantes ep on ep.id = pc.participante_id
    where pc.user_id = (select auth.uid())
      and pc.participante_id::text = split_part(name, '/', 1)
      and pc.estado = 'activo'
      and ep.estado = 'activo'
      and public.es_admin((select auth.uid()))
  )
);

drop policy if exists "identidades comerciales borrar logo" on storage.objects;
create policy "identidades comerciales borrar logo"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'identidades-comerciales'
  and exists (
    select 1
    from public.participante_cuentas pc
    join public.ecosistema_participantes ep on ep.id = pc.participante_id
    where pc.user_id = (select auth.uid())
      and pc.participante_id::text = split_part(name, '/', 1)
      and pc.estado = 'activo'
      and ep.estado = 'activo'
      and public.es_admin((select auth.uid()))
  )
);

commit;
