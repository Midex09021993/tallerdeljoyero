-- Catálogo de Joyas: autorización canónica de Storage.
-- La ruta de subida usa:
--   <participante_id>/<producto|carpeta>/<archivo>
-- El usuario debe ser dueño o gerente y tener una cuenta activa
-- vinculada al participante de la ruta.
begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'catalogo-joyas',
  'catalogo-joyas',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "catalogo joyas subir admin" on storage.objects;
drop policy if exists "catalogo joyas subir" on storage.objects;

create policy "catalogo joyas subir"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'catalogo-joyas'
  and public.es_admin((select auth.uid()))
  and exists (
    select 1
    from public.participante_cuentas pc
    join public.ecosistema_participantes ep
      on ep.id = pc.participante_id
    where pc.user_id = (select auth.uid())
      and pc.participante_id::text = split_part(name, '/', 1)
      and pc.estado = 'activo'
      and ep.estado = 'activo'
  )
);

drop policy if exists "catalogo joyas actualizar admin" on storage.objects;
drop policy if exists "catalogo joyas actualizar" on storage.objects;

create policy "catalogo joyas actualizar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'catalogo-joyas'
  and public.es_admin((select auth.uid()))
  and exists (
    select 1
    from public.participante_cuentas pc
    join public.ecosistema_participantes ep
      on ep.id = pc.participante_id
    where pc.user_id = (select auth.uid())
      and pc.participante_id::text = split_part(name, '/', 1)
      and pc.estado = 'activo'
      and ep.estado = 'activo'
  )
)
with check (
  bucket_id = 'catalogo-joyas'
  and public.es_admin((select auth.uid()))
  and exists (
    select 1
    from public.participante_cuentas pc
    join public.ecosistema_participantes ep
      on ep.id = pc.participante_id
    where pc.user_id = (select auth.uid())
      and pc.participante_id::text = split_part(name, '/', 1)
      and pc.estado = 'activo'
      and ep.estado = 'activo'
  )
);

drop policy if exists "catalogo joyas borrar admin" on storage.objects;
drop policy if exists "catalogo joyas borrar" on storage.objects;

create policy "catalogo joyas borrar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'catalogo-joyas'
  and public.es_admin((select auth.uid()))
  and exists (
    select 1
    from public.participante_cuentas pc
    join public.ecosistema_participantes ep
      on ep.id = pc.participante_id
    where pc.user_id = (select auth.uid())
      and pc.participante_id::text = split_part(name, '/', 1)
      and pc.estado = 'activo'
      and ep.estado = 'activo'
  )
);

commit;
