-- Ajuste de autorización del Storage del Catálogo de Joyas.
-- Causa raíz: la política anterior dependía de castear el primer segmento
-- de la ruta a uuid y de la función de autorización. La ruta ya contiene
-- el participante_id canónico, por lo que autorizamos directamente contra
-- participante_cuentas + ecosistema_participantes sin ampliar permisos.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalogo-joyas',
  'catalogo-joyas',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/avif']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "catalogo joyas subir admin" on storage.objects;
create policy "catalogo joyas subir admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'catalogo-joyas'
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

drop policy if exists "catalogo joyas actualizar admin" on storage.objects;
create policy "catalogo joyas actualizar admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'catalogo-joyas'
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
  bucket_id = 'catalogo-joyas'
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

drop policy if exists "catalogo joyas borrar admin" on storage.objects;
create policy "catalogo joyas borrar admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'catalogo-joyas'
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