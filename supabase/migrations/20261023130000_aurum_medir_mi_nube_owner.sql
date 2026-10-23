-- Métricas de Mi Nube para la ficha administrativa del dueño.
-- Separa carpetas/espacio propios de carpetas/espacio compartidos recibidos.
begin;

create or replace function public.aurum_medir_mi_nube_owner(p_participante_id uuid)
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
as $$
begin
  if auth.uid() is null
     or not public.has_role(auth.uid(), 'dueno'::public.app_role) then
    raise exception 'No autorizado para consultar métricas administrativas de Mi Nube'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.ecosistema_participantes ep
    where ep.id = p_participante_id
      and ep.tipo_participante = 'organizacion'
      and ep.sede_id is not null
  ) then
    raise exception 'Taller no válido'
      using errcode = '22023';
  end if;

  return query
  with cuentas_taller as (
    select pc.user_id
    from public.participante_cuentas pc
    where pc.participante_id = p_participante_id
      and pc.estado = 'activo'
  ),
  propios as (
    select
      count(distinct split_part(o.name, '/', 3))::bigint as carpetas,
      coalesce(sum(case
        when coalesce(o.metadata->>'size', '') ~ '^[0-9]+$'
        then (o.metadata->>'size')::bigint
        else 0
      end), 0)::bigint as bytes
    from storage.objects o
    join cuentas_taller ct
      on split_part(o.name, '/', 2) = ct.user_id::text
    where o.bucket_id = 'mi-nube'
      and split_part(o.name, '/', 1) = p_participante_id::text
      and split_part(o.name, '/', 3) <> ''
      and split_part(o.name, '/', 4) <> ''
  ),
  carpetas_recibidas as (
    select distinct
      s.propietario_participante_id,
      s.propietario_usuario_id,
      s.carpeta
    from public.mi_nube_compartidas s
    where s.destinatario_participante_id = p_participante_id
      and s.revoked_at is null
  ),
  compartidos as (
    select
      (select count(*)::bigint from carpetas_recibidas) as carpetas,
      coalesce(sum(case
        when coalesce(o.metadata->>'size', '') ~ '^[0-9]+$'
        then (o.metadata->>'size')::bigint
        else 0
      end), 0)::bigint as bytes
    from carpetas_recibidas s
    left join storage.objects o
      on o.bucket_id = 'mi-nube'
     and split_part(o.name, '/', 1) = s.propietario_participante_id::text
     and split_part(o.name, '/', 2) = s.propietario_usuario_id::text
     and split_part(o.name, '/', 3) = s.carpeta
     and split_part(o.name, '/', 4) <> ''
  )
  select propios.carpetas, propios.bytes, compartidos.carpetas, compartidos.bytes
  from propios cross join compartidos;
end;
$$;

revoke all on function public.aurum_medir_mi_nube_owner(uuid) from public, anon;
grant execute on function public.aurum_medir_mi_nube_owner(uuid) to authenticated;

comment on function public.aurum_medir_mi_nube_owner(uuid) is
  'Solo dueños: cuenta carpetas y bytes propios y compartidos recibidos de Mi Nube, por separado.';
commit;
