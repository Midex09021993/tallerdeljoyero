-- Asegura que la asignación de un participante externo cambie también
-- la clasificación operativa del trabajo.
-- sede_id permanece en el taller de origen.

begin;

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
  v_uid uuid := (select auth.uid());
  v_trabajo public.trabajos;
  v_participante public.ecosistema_participantes;
begin
  if not public.es_admin(v_uid) then
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

  if not public.ve_sede(v_uid, v_trabajo.sede_id) then
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
      tipo = case
        when _participante_id is null then 'interno'
        else 'externo'
      end,
      responsable_user_id = null,
      updated_at = now()
  where id = _trabajo_id
  returning * into v_trabajo;

  return jsonb_build_object(
    'trabajo_id', v_trabajo.id,
    'tipo', v_trabajo.tipo,
    'participante_id', v_trabajo.participante_id,
    'responsable_user_id', v_trabajo.responsable_user_id
  );
end;
$$;

revoke all on function public.asignar_participante_externo_trabajo(uuid, uuid) from public, anon;
grant execute on function public.asignar_participante_externo_trabajo(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
