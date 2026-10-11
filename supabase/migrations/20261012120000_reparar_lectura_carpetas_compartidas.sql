-- Repara el acceso de lectura a carpetas compartidas de Mi Nube.
-- No hace públicos los archivos ni permite editar/eliminar al taller receptor.
begin;

drop policy if exists "Mi Nube read shared folder" on storage.objects;

create policy "Mi Nube read shared folder"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'mi-nube'
  and exists (
    select 1
    from public.mi_nube_compartidas s
    join public.participante_cuentas pc
      on pc.participante_id = s.destinatario_participante_id
     and pc.user_id = (select auth.uid())
     and pc.estado = 'activo'
    join public.ecosistema_participantes receptor
      on receptor.id = s.destinatario_participante_id
     and receptor.estado = 'activo'
    join public.ecosistema_participantes propietario
      on propietario.id = s.propietario_participante_id
     and propietario.estado = 'activo'
    where s.revoked_at is null
      and s.destinatario_participante_id <> s.propietario_participante_id
      and left(
        name,
        length(
          s.propietario_participante_id::text || '/' ||
          s.propietario_usuario_id::text || '/' ||
          s.carpeta || '/'
        )
      ) = (
        s.propietario_participante_id::text || '/' ||
        s.propietario_usuario_id::text || '/' ||
        s.carpeta || '/'
      )
  )
);

comment on policy "Mi Nube read shared folder" on storage.objects is
  'Permite listar y leer solo los objetos dentro de carpetas compartidas activas; no concede escritura ni acceso público.';

commit;
