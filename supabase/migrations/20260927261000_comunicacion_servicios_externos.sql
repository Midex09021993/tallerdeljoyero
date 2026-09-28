-- Comunicación operativa entre talleres para servicios externos.
-- El taller receptor puede ver y ejecutar únicamente trabajos cuyo
-- participante_id coincide con su cuenta activa en participante_cuentas.
-- sede_id conserva el taller de origen y no se mueve.

begin;

create or replace function public.listar_trabajos_operario()
returns table (
  id uuid,
  pedido_id uuid,
  area text,
  ubicacion text,
  titulo text,
  descripcion text,
  estado text,
  prioridad text,
  tipo text,
  fecha_planificada date,
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  notas text,
  responsable_user_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not public.has_role(v_uid, 'operario') then
    raise exception 'Solo un operario puede consultar su bandeja';
  end if;

  return query
  select
    t.id,
    t.pedido_id,
    t.area,
    t.ubicacion,
    t.titulo,
    t.descripcion,
    t.estado,
    t.prioridad,
    t.tipo,
    t.fecha_planificada,
    t.fecha_inicio,
    t.fecha_fin,
    t.notas,
    t.responsable_user_id
  from public.trabajos t
  where t.estado in ('pendiente', 'en_proceso', 'bloqueado')
    and (
      (
        t.tipo <> 'externo'
        and public.ve_sede(v_uid, t.sede_id)
      )
      or
      (
        t.tipo = 'externo'
        and exists (
          select 1
          from public.participante_cuentas pc
          where pc.user_id = v_uid
            and pc.participante_id = t.participante_id
            and pc.estado = 'activo'
        )
      )
    )
    and (
      t.responsable_user_id = v_uid
      or (
        t.responsable_user_id is null
        and exists (
          select 1
          from public.user_areas ua
          where ua.user_id = v_uid
            and lower(trim(ua.area)) = lower(trim(t.area))
        )
      )
    )
  order by t.fecha_planificada nulls first, t.created_at;
end;
$$;

-- Permitir que el receptor tome un servicio externo asignado a su participante.
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

  if not (
    (
      v_trabajo.tipo = 'externo'
      and exists (
        select 1
        from public.participante_cuentas pc
        where pc.user_id = v_uid
          and pc.participante_id = v_trabajo.participante_id
          and pc.estado = 'activo'
      )
    )
    or
    (
      v_trabajo.tipo <> 'externo'
      and public.ve_sede(v_uid, v_trabajo.sede_id)
    )
  ) then
    raise exception 'No tienes acceso a este trabajo';
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

-- El receptor puede cambiar estado de un servicio externo que pertenece a su participante.
create or replace function public.cambiar_estado_trabajo(_trabajo_id uuid, _nuevo_estado text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_trabajo public.trabajos;
begin
  select t.*
  into v_trabajo
  from public.trabajos t
  where t.id = _trabajo_id
  for update;

  if v_trabajo.id is null then
    raise exception 'Trabajo no encontrado';
  end if;

  if _nuevo_estado not in ('pendiente', 'en_proceso', 'bloqueado', 'completado', 'cancelado') then
    raise exception 'Estado de trabajo no válido';
  end if;

  if v_trabajo.tipo = 'externo' then
    if not exists (
      select 1
      from public.participante_cuentas pc
      where pc.user_id = v_uid
        and pc.participante_id = v_trabajo.participante_id
        and pc.estado = 'activo'
    ) then
      raise exception 'No tienes acceso al servicio externo';
    end if;

    if public.has_role(v_uid, 'gerente') or public.has_role(v_uid, 'dueno') then
      null;
    elsif v_trabajo.responsable_user_id = v_uid then
      null;
    else
      raise exception 'Debes tomar el trabajo antes de cambiar su estado';
    end if;
  else
    if not (
      public.has_role(v_uid, 'dueno')
      or (
        public.has_role(v_uid, 'gerente')
        and public.ve_sede(v_uid, v_trabajo.sede_id)
      )
      or (
        v_trabajo.responsable_user_id = v_uid
        and public.ve_sede(v_uid, v_trabajo.sede_id)
      )
    ) then
      raise exception 'No tienes permiso para cambiar este trabajo';
    end if;
  end if;

  update public.trabajos
  set estado = _nuevo_estado,
      fecha_inicio = case
        when _nuevo_estado = 'en_proceso' and fecha_inicio is null then now()
        else fecha_inicio
      end,
      fecha_fin = case
        when _nuevo_estado in ('completado', 'cancelado') then now()
        when _nuevo_estado not in ('completado', 'cancelado') then null
        else fecha_fin
      end,
      updated_at = now()
  where id = _trabajo_id;
end;
$$;

revoke all on function public.listar_trabajos_operario() from public, anon;
grant execute on function public.listar_trabajos_operario() to authenticated;
revoke all on function public.tomar_trabajo(uuid) from public, anon;
grant execute on function public.tomar_trabajo(uuid) to authenticated;
revoke all on function public.cambiar_estado_trabajo(uuid, text) from public, anon;
grant execute on function public.cambiar_estado_trabajo(uuid, text) to authenticated;

notify pgrst, 'reload schema';

commit;
