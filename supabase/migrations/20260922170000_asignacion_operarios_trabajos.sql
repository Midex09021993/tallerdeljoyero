-- Asignación explícita de operarios a operaciones de producción.
-- El área (Taller, Casting, etc.) determina dónde ocurre el trabajo;
-- responsable_user_id determina qué operario concreto lo ejecuta.

create or replace function public.listar_operarios_por_area(_sede_id uuid)
returns table (
  id uuid,
  nombre text,
  areas text[]
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin((select auth.uid())) then
    raise exception 'No autorizado';
  end if;

  if _sede_id is null or not public.ve_sede((select auth.uid()), _sede_id) then
    raise exception 'No tienes acceso a este taller';
  end if;

  return query
  select
    p.id,
    p.nombre,
    coalesce(
      array_agg(distinct ua.area) filter (where ua.area is not null),
      array[]::text[]
    ) as areas
  from public.profiles p
  join public.user_roles ur
    on ur.user_id = p.id
   and ur.role = 'operario'
  left join public.user_areas ua
    on ua.user_id = p.id
  where p.activo = true
    and p.sede_id = _sede_id
  group by p.id, p.nombre
  order by p.nombre;
end;
$$;

revoke all on function public.listar_operarios_por_area(uuid) from public, anon;
grant execute on function public.listar_operarios_por_area(uuid) to authenticated;


create or replace function public.asignar_responsable_trabajo(
  _trabajo_id uuid,
  _responsable_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trabajo public.trabajos;
  v_responsable public.profiles;
begin
  if not public.es_admin((select auth.uid())) then
    raise exception 'Solo un administrador puede asignar responsables';
  end if;

  select *
  into v_trabajo
  from public.trabajos
  where id = _trabajo_id
  for update;

  if v_trabajo.id is null then
    raise exception 'Trabajo no encontrado';
  end if;

  if not public.ve_sede((select auth.uid()), v_trabajo.sede_id) then
    raise exception 'No tienes acceso al taller de este trabajo';
  end if;

  if _responsable_user_id is not null then
    select *
    into v_responsable
    from public.profiles
    where id = _responsable_user_id
      and activo = true
      and sede_id = v_trabajo.sede_id;

    if v_responsable.id is null then
      raise exception 'El operario no pertenece al taller o está inactivo';
    end if;

    if not public.has_role(_responsable_user_id, 'operario') then
      raise exception 'El responsable seleccionado no tiene rol de operario';
    end if;

    if not exists (
      select 1
      from public.user_areas ua
      where ua.user_id = _responsable_user_id
        and lower(trim(ua.area)) = lower(trim(v_trabajo.area))
    ) then
      raise exception 'El operario no tiene asignada el área %', v_trabajo.area;
    end if;
  end if;

  update public.trabajos
  set responsable_user_id = _responsable_user_id,
      updated_at = now()
  where id = _trabajo_id
  returning * into v_trabajo;

  return jsonb_build_object(
    'trabajo_id', v_trabajo.id,
    'responsable_user_id', v_trabajo.responsable_user_id
  );
end;
$$;

revoke all on function public.asignar_responsable_trabajo(uuid, uuid) from public, anon;
grant execute on function public.asignar_responsable_trabajo(uuid, uuid) to authenticated;

comment on function public.asignar_responsable_trabajo(uuid, uuid) is
  'Asigna o retira el operario responsable de una operación, validando sede, rol y área.';
