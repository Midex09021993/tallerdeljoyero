-- Compatibilidad de alias históricos de áreas en la asignación de responsables.
-- Mantiene la regla: un responsable interno debe ser operario activo,
-- pertenecer a la misma sede y tener el área compatible.

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
  v_area_trabajo text;
  v_area_responsable text;
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

    v_area_trabajo := lower(trim(v_trabajo.area));
    if v_area_trabajo = 'servicio láser' or v_area_trabajo = 'corte laser' or v_area_trabajo = 'corte láser' then
      v_area_trabajo := 'corte láser';
    elsif v_area_trabajo = 'taller / engaste' or v_area_trabajo = 'más alto' or v_area_trabajo = 'mas alto' then
      v_area_trabajo := 'taller';
    end if;

    if not exists (
      select 1
      from public.user_areas ua
      where ua.user_id = _responsable_user_id
        and (
          lower(trim(ua.area)) = v_area_trabajo
          or (
            v_area_trabajo = 'taller'
            and lower(trim(ua.area)) = 'taller / engaste'
          )
          or (
            v_area_trabajo = 'corte láser'
            and lower(trim(ua.area)) in ('servicio láser', 'corte laser', 'corte láser')
          )
        )
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
