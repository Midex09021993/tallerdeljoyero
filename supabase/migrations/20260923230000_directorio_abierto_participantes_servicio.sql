-- Directorio abierto de proveedores/talleres/profesionales externos por capacidad.
-- Cualquier participante activo del ecosistema que tenga una especialidad activa
-- puede ser candidato para una operación compatible.
create or replace function public.listar_participantes_servicio(
  _area text default null
)
returns table (
  id uuid,
  nombre text,
  tipo_participante text,
  especialidad text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin((select auth.uid())) then
    raise exception 'No autorizado';
  end if;

  return query
  select
    ep.id,
    ep.nombre,
    ep.tipo_participante,
    string_agg(distinct e.nombre, ' · ' order by e.nombre) as especialidad
  from public.ecosistema_participantes ep
  join public.participante_especialidades pe
    on pe.participante_id = ep.id
  join public.especialidades e
    on e.id = pe.especialidad_id
  where ep.estado = 'activo'
    and e.activa = true
    and (
      nullif(trim(_area), '') is null
      or lower(trim(e.nombre)) = lower(trim(_area))
    )
  group by ep.id, ep.nombre, ep.tipo_participante
  order by ep.nombre;
end;
$$;

revoke all on function public.listar_participantes_servicio() from public, anon;
revoke all on function public.listar_participantes_servicio(text) from public, anon;

grant execute on function public.listar_participantes_servicio() to authenticated;
grant execute on function public.listar_participantes_servicio(text) to authenticated;
