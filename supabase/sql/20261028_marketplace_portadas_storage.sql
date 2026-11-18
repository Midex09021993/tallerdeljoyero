-- AURUM LAB · permisos mínimos para portadas del marketplace.
-- Ejecutar manualmente en el SQL Editor de Lovable Cloud.
-- Ruta autorizada: <participante_id>/marketplace-portadas/<usuario_id>/<uuid>.<ext>
-- El usuario autenticado solo puede crear portadas bajo su propio taller y su propia carpeta.
-- La lectura pública depende del bucket catalogo-joyas, que ya está configurado como público.

begin;

drop policy if exists "marketplace portadas subir propias" on storage.objects;

create policy "marketplace portadas subir propias"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'catalogo-joyas'
  and split_part(name, '/', 2) = 'marketplace-portadas'
  and split_part(name, '/', 3) = (select auth.uid())::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
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

notify pgrst, 'reload schema';
commit;

-- Verificación: debe aparecer una política INSERT para el bucket de portadas.
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname = 'marketplace portadas subir propias';
