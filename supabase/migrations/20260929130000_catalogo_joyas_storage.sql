-- Storage propio del Catálogo de Joyas.
-- Las imágenes públicas se sirven desde este bucket; la escritura queda limitada
-- a administradores que pertenecen al participante del catálogo.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalogo-joyas',
  'catalogo-joyas',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/avif']::text[]
)
on conflict (id) do nothing;

drop policy if exists "catalogo joyas leer publico" on storage.objects;
create policy "catalogo joyas leer publico"
on storage.objects
for select
to public
using (bucket_id = 'catalogo-joyas');

drop policy if exists "catalogo joyas subir admin" on storage.objects;
create policy "catalogo joyas subir admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'catalogo-joyas'
  and public.es_admin((select auth.uid()))
  and public.tiene_participante(
    (select auth.uid()),
    (split_part(name, '/', 1))::uuid
  )
);

drop policy if exists "catalogo joyas actualizar admin" on storage.objects;
create policy "catalogo joyas actualizar admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'catalogo-joyas'
  and public.es_admin((select auth.uid()))
  and public.tiene_participante(
    (select auth.uid()),
    (split_part(name, '/', 1))::uuid
  )
)
with check (
  bucket_id = 'catalogo-joyas'
  and public.es_admin((select auth.uid()))
  and public.tiene_participante(
    (select auth.uid()),
    (split_part(name, '/', 1))::uuid
  )
);

drop policy if exists "catalogo joyas borrar admin" on storage.objects;
create policy "catalogo joyas borrar admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'catalogo-joyas'
  and public.es_admin((select auth.uid()))
  and public.tiene_participante(
    (select auth.uid()),
    (split_part(name, '/', 1))::uuid
  )
);

commit;