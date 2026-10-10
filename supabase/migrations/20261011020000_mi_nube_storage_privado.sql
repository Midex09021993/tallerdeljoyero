-- Mi Nube: almacenamiento privado por participante y usuario.
-- La autorización depende de participante_cuentas + ecosistema_participantes activos.
-- No reutiliza buckets públicos ni concede acceso por profiles.sede_id.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mi-nube', 'mi-nube', false, 524288000, null)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "mi nube leer archivos propios" on storage.objects;
create policy "mi nube leer archivos propios"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'mi-nube'
  and split_part(name, '/', 2) = (select auth.uid())::text
  and exists (
    select 1
    from public.participante_cuentas pc
    join public.ecosistema_participantes ep on ep.id = pc.participante_id
    where pc.user_id = (select auth.uid())
      and pc.participante_id::text = split_part(name, '/', 1)
      and pc.estado = 'activo'
      and ep.estado = 'activo'
  )
);

drop policy if exists "mi nube subir archivos propios" on storage.objects;
create policy "mi nube subir archivos propios"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'mi-nube'
  and split_part(name, '/', 2) = (select auth.uid())::text
  and exists (
    select 1
    from public.participante_cuentas pc
    join public.ecosistema_participantes ep on ep.id = pc.participante_id
    where pc.user_id = (select auth.uid())
      and pc.participante_id::text = split_part(name, '/', 1)
      and pc.estado = 'activo'
      and ep.estado = 'activo'
  )
);

drop policy if exists "mi nube borrar archivos propios" on storage.objects;
create policy "mi nube borrar archivos propios"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'mi-nube'
  and split_part(name, '/', 2) = (select auth.uid())::text
  and exists (
    select 1
    from public.participante_cuentas pc
    join public.ecosistema_participantes ep on ep.id = pc.participante_id
    where pc.user_id = (select auth.uid())
      and pc.participante_id::text = split_part(name, '/', 1)
      and pc.estado = 'activo'
      and ep.estado = 'activo'
  )
);

comment on policy "mi nube leer archivos propios" on storage.objects is
  'Mi Nube privada: cada usuario autenticado solo lista/lee sus archivos del participante activo.';

commit;
