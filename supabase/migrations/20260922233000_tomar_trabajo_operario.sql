-- Permite que un operario tome una operación que está sin responsable
-- únicamente si pertenece al mismo taller y tiene asignada el área del trabajo.

create or replace function public.tomar_trabajo(_trabajo_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_trabajo public.trabajos;
begin
  if v_uid is null or not public.has_role(v_uid, 'operario') then
    raise exception 'Solo un operario puede tomar un trabajo';
  end if;

  select *
  into v_trabajo
  from public.trabajos
  where id = _trabajo_id
  for update;

  if v_trabajo.id is null then
    raise exception 'Trabajo no encontrado';
  end if;

  if not public.ve_sede(v_uid, v_trabajo.sede_id) then
    raise exception 'No tienes acceso al taller de este trabajo';
  end if;

  if not exists (
    select 1
    from public.user_areas ua
    where ua.user_id = v_uid
      and lower(trim(ua.area)) = lower(trim(v_trabajo.area))
  ) then
    raise exception 'No tienes asignada el área de este trabajo';
  end if;

  if v_trabajo.responsable_user_id is not null
     and v_trabajo.responsable_user_id is distinct from v_uid then
    raise exception 'Este trabajo ya fue asignado a otro operario';
  end if;

  update public.trabajos
  set responsable_user_id = v_uid,
      updated_at = now()
  where id = _trabajo_id
  returning * into v_trabajo;

  return jsonb_build_object(
    'trabajo_id', v_trabajo.id,
    'responsable_user_id', v_trabajo.responsable_user_id
  );
end;
$$;

revoke all on function public.tomar_trabajo(uuid) from public, anon;
grant execute on function public.tomar_trabajo(uuid) to authenticated;
