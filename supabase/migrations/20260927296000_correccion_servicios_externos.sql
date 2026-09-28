-- Correccion canonica de servicios externos.
-- Regla: si un trabajo tiene participante_id explicito, ese participante
-- es el ejecutor externo y el trabajo debe quedar como tipo=externo.
-- sede_id siempre conserva el taller de origen.

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
      raise exception 'El servicio externo no existe o esta inactivo';
    end if;

    if v_participante.sede_id = v_trabajo.sede_id then
      raise exception 'El ejecutor externo debe pertenecer a otro taller';
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

create or replace function public.reconciliar_servicios_externos_pendientes(
  _orden_produccion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_op public.ordenes_produccion;
  r record;
  v_destino uuid;
  v_candidatos integer;
  v_externos integer := 0;
  v_internos integer := 0;
begin
  if v_uid is null then
    raise exception 'Sesion no valida';
  end if;

  if not public.es_admin(v_uid) then
    raise exception 'Solo un administrador puede reconciliar servicios externos';
  end if;

  select *
  into v_op
  from public.ordenes_produccion
  where id = _orden_produccion_id
  for update;

  if v_op.id is null then
    raise exception 'Orden de produccion no encontrada';
  end if;

  if not public.ve_sede(v_uid, v_op.sede_id) then
    raise exception 'No tienes acceso a esta orden de produccion';
  end if;

  for r in
    select
      t.id,
      t.area,
      t.sede_id,
      t.tipo,
      t.participante_id,
      t.responsable_user_id
    from public.trabajos t
    where t.orden_produccion_id = _orden_produccion_id
      and t.estado = 'pendiente'
    order by t.secuencia
  loop

    -- Una asignacion explicita de participante siempre prevalece.
    if r.participante_id is not null then
      if exists (
        select 1
        from public.ecosistema_participantes ep
        join public.participante_especialidades pe
          on pe.participante_id = ep.id
        join public.especialidades e
          on e.id = pe.especialidad_id
        where ep.id = r.participante_id
          and ep.estado = 'activo'
          and ep.sede_id is not null
          and ep.sede_id <> r.sede_id
          and e.activa = true
          and lower(trim(e.nombre)) = lower(trim(r.area))
      ) then
        update public.trabajos
        set tipo = 'externo',
            responsable_user_id = null,
            updated_at = now()
        where id = r.id
          and (tipo is distinct from 'externo' or responsable_user_id is not null);

        if found then
          v_externos := v_externos + 1;
        end if;
      end if;

      continue;
    end if;

    -- Sin ejecutor externo: conservar interno si el origen tiene capacidad.
    if exists (
      select 1
      from public.ecosistema_participantes ep
      join public.participante_especialidades pe
        on pe.participante_id = ep.id
      join public.especialidades e
        on e.id = pe.especialidad_id
      where ep.sede_id = r.sede_id
        and ep.estado = 'activo'
        and e.activa = true
        and lower(trim(e.nombre)) = lower(trim(r.area))
    ) then
      update public.trabajos
      set tipo = 'interno',
          participante_id = null,
          updated_at = now()
      where id = r.id
        and (tipo is distinct from 'interno' or participante_id is not null);

      if found then
        v_internos := v_internos + 1;
      end if;

      continue;
    end if;

    -- Sin capacidad interna: asignar solo si existe un unico candidato externo.
    select count(*), min(ep.id)
    into v_candidatos, v_destino
    from public.ecosistema_participantes ep
    join public.participante_especialidades pe
      on pe.participante_id = ep.id
    join public.especialidades e
      on e.id = pe.especialidad_id
    where ep.estado = 'activo'
      and ep.sede_id is not null
      and ep.sede_id <> r.sede_id
      and e.activa = true
      and lower(trim(e.nombre)) = lower(trim(r.area));

    if v_candidatos = 1 then
      update public.trabajos
      set tipo = 'externo',
          participante_id = v_destino,
          responsable_user_id = null,
          updated_at = now()
      where id = r.id;

      if found then
        v_externos := v_externos + 1;
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'orden_produccion_id', _orden_produccion_id,
    'servicios_externos', v_externos,
    'trabajos_internos', v_internos
  );
end;
$$;

revoke all on function public.reconciliar_servicios_externos_pendientes(uuid) from public, anon;
grant execute on function public.reconciliar_servicios_externos_pendientes(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
