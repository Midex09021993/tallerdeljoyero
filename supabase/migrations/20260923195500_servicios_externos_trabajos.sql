-- Servicios externos del ecosistema para asignación de trabajos.
create or replace function public.listar_participantes_servicio()
returns table (
  id uuid,
  nombre text,
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
    string_agg(distinct e.nombre, ' · ' order by e.nombre) as especialidad
  from public.ecosistema_participantes ep
  join public.participante_especialidades pe
    on pe.participante_id = ep.id
  join public.especialidades e
    on e.id = pe.especialidad_id
  where ep.estado = 'activo'
    and e.activa = true
  group by ep.id, ep.nombre
  order by ep.nombre;
end;
$$;

revoke all on function public.listar_participantes_servicio() from public, anon;
grant execute on function public.listar_participantes_servicio() to authenticated;

create or replace function public.asignar_participante_externo_trabajo(
  _trabajo_id uuid,
  _participante_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trabajo public.trabajos;
  v_participante public.ecosistema_participantes;
begin
  if not public.es_admin((select auth.uid())) then
    raise exception 'Solo un administrador puede asignar servicios externos';
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

  if _participante_id is not null then
    select *
    into v_participante
    from public.ecosistema_participantes
    where id = _participante_id
      and estado = 'activo';

    if v_participante.id is null then
      raise exception 'El servicio externo no existe o está inactivo';
    end if;

    if not exists (
      select 1
      from public.participante_especialidades pe
      join public.especialidades e
        on e.id = pe.especialidad_id
      where pe.participante_id = _participante_id
        and e.activa = true
        and lower(trim(e.nombre)) = lower(trim(v_trabajo.area))
    ) then
      raise exception 'El participante externo no tiene configurada la especialidad %', v_trabajo.area;
    end if;
  end if;

  update public.trabajos
  set participante_id = _participante_id,
      responsable_user_id = null,
      updated_at = now()
  where id = _trabajo_id
  returning * into v_trabajo;

  return jsonb_build_object(
    'trabajo_id', v_trabajo.id,
    'participante_id', v_trabajo.participante_id,
    'responsable_user_id', v_trabajo.responsable_user_id
  );
end;
$$;

revoke all on function public.asignar_participante_externo_trabajo(uuid, uuid) from public, anon;
grant execute on function public.asignar_participante_externo_trabajo(uuid, uuid) to authenticated;

-- Cuando se asigna un operario interno, el trabajo deja de pertenecer
-- a un participante externo.
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
      participante_id = null,
      updated_at = now()
  where id = _trabajo_id
  returning * into v_trabajo;

  return jsonb_build_object(
    'trabajo_id', v_trabajo.id,
    'responsable_user_id', v_trabajo.responsable_user_id,
    'participante_id', v_trabajo.participante_id
  );
end;
$$;

revoke all on function public.asignar_responsable_trabajo(uuid, uuid) from public, anon;
grant execute on function public.asignar_responsable_trabajo(uuid, uuid) to authenticated;
