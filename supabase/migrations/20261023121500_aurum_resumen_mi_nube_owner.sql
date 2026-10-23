-- Resumen seguro de cuotas de Mi Nube para la ficha administrativa del dueño.
-- Aplicar manualmente en Supabase SQL Editor. No copia, modifica ni elimina objetos.
begin;

create or replace function public.aurum_resumen_mi_nube_owner(p_participante_id uuid)
returns table (
  carpetas_propias bigint,
  bytes_propios bigint,
  carpetas_compartidas bigint,
  bytes_compartidos bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null
     or not public.has_role(auth.uid(), 'dueno'::public.app_role) then
    raise exception 'No autorizado para consultar el resumen de Mi Nube'
      using errcode = '42501';
  end if;

  if p_participante_id is null then
    raise exception 'El taller es obligatorio' using errcode = '22004';
  end if;

  if not exists (
    select 1
    from public.ecosistema_participantes ep
    where ep.id = p_participante_id
      and ep.tipo_participante = 'organizacion'
      and ep.sede_id is not null
  ) then
    raise exception 'El participante no es un taller integrado' using errcode = '22023';
  end if;

  -- Se cuentan todas las raíces usuario activas vinculadas al taller,
  -- porque Mi Nube almacena cada usuario bajo participanteId/usuarioId.
  -- Solo bucket mi-nube; no se consulta ni suma el NAS.
  return query
  with cuentas_propias as (
    select distinct pc.user_id
    from public.participante_cuentas pc
    where pc.participante_id = p_participante_id
      and pc.estado = 'activo'
  ),
  own_objects as (
    select o.name,
           case
             when coalesce(o.metadata->>'size', '') ~ '^[0-9]+$'
               then (o.metadata->>'size')::bigint
             else 0::bigint
           end as object_bytes
    from storage.objects o
    join cuentas_propias cp
      on split_part(o.name, '/', 2) = cp.user_id::text
    where o.bucket_id = 'mi-nube'
      and split_part(o.name, '/', 1) = p_participante_id::text
      and array_length(string_to_array(o.name, '/'), 1) >= 4
  ),
  own_summary as (
    select count(distinct (split_part(name, '/', 2), split_part(name, '/', 3)))::bigint as folder_count,
           coalesce(sum(object_bytes), 0)::bigint as total_bytes
    from own_objects
  ),
  received_folders as (
    select distinct s.propietario_participante_id, s.propietario_usuario_id, s.carpeta
    from public.mi_nube_compartidas s
    where s.destinatario_participante_id = p_participante_id
      and s.revoked_at is null
  ),
  received_bytes as (
    select
      coalesce(
        sum(
          case
            when coalesce(o.metadata->>'size', '') ~ '^[0-9]+$'
              then (o.metadata->>'size')::bigint
            else 0::bigint
          end
        ),
        0
      )::bigint as total_bytes
    from received_folders f
    left join storage.objects o
      on o.bucket_id = 'mi-nube'
     and split_part(o.name, '/', 1) =
         f.propietario_participante_id::text
     and split_part(o.name, '/', 2) =
         f.propietario_usuario_id::text
     and split_part(o.name, '/', 3) = f.carpeta
     and array_length(string_to_array(o.name, '/'), 1) >= 4
  ),
  received_summary as (
    select
      (select count(*)::bigint from received_folders) as folder_count,
      rb.total_bytes
    from received_bytes rb
  )
  select os.folder_count, os.total_bytes, rs.folder_count, rs.total_bytes
  from own_summary os cross join received_summary rs;
end;
$function$;

revoke all on function public.aurum_resumen_mi_nube_owner(uuid) from public, anon;
grant execute on function public.aurum_resumen_mi_nube_owner(uuid) to authenticated;

comment on function public.aurum_resumen_mi_nube_owner(uuid) is
'Resumen administrativo de Mi Nube: objetos del bucket mi-nube, cuentas activas del taller, carpetas compartidas activas deduplicadas y autorización exclusiva para rol dueno. No incluye NAS.';

commit;
