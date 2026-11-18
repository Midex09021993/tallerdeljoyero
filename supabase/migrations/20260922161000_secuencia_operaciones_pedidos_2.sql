-- Motor de secuencia de operaciones para Pedidos 2.
-- Una OP liberada y puesta en producción activa únicamente la primera operación.
-- Al completar una operación, la siguiente se habilita automáticamente.

create or replace function public.activar_ruta_inicial_produccion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trabajo public.trabajos;
begin
  if new.estado <> 'en_produccion' or old.estado = 'en_produccion' then
    return new;
  end if;

  -- Solo una operación de la ruta puede quedar activa.
  update public.trabajos
  set estado = case
      when secuencia = (
        select min(t.secuencia)
        from public.trabajos t
        where t.orden_produccion_id = new.id
          and t.estado not in ('completado', 'cancelado')
      )
      then 'en_proceso'
      else case when estado = 'bloqueado' then 'bloqueado' else 'pendiente' end
    end,
    fecha_inicio = case
      when secuencia = (
        select min(t.secuencia)
        from public.trabajos t
        where t.orden_produccion_id = new.id
          and t.estado not in ('completado', 'cancelado')
      )
      then coalesce(fecha_inicio, now())
      else fecha_inicio
    end,
    updated_at = now()
  where orden_produccion_id = new.id
    and estado <> 'completado'
    and estado <> 'cancelado';

  select *
  into v_trabajo
  from public.trabajos t
  where t.orden_produccion_id = new.id
    and t.estado = 'en_proceso'
  order by t.secuencia nulls last, t.created_at
  limit 1;

  if v_trabajo.id is not null then
    update public.pedidos
    set area_actual = v_trabajo.area,
        area_desde = now(),
        updated_at = now()
    where id = new.pedido_id
      and estado not in ('Entregado', 'Cancelado');
  end if;

  return new;
end;
$$;

drop trigger if exists activar_ruta_inicial_produccion_trg on public.ordenes_produccion;
create trigger activar_ruta_inicial_produccion_trg
after update of estado on public.ordenes_produccion
for each row
execute function public.activar_ruta_inicial_produccion();

revoke all on function public.activar_ruta_inicial_produccion() from public, anon, authenticated;


create or replace function public.cambiar_estado_trabajo(_trabajo_id uuid, _nuevo_estado text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trabajo public.trabajos;
  v_op public.ordenes_produccion;
  v_siguiente public.trabajos;
  v_pedido public.pedidos;
  v_resp uuid;
begin
  if _nuevo_estado not in ('pendiente','en_proceso','bloqueado','completado','cancelado') then
    raise exception 'Estado no válido: %', _nuevo_estado;
  end if;

  select *
  into v_trabajo
  from public.trabajos
  where id = _trabajo_id
  for update;

  if v_trabajo.id is null then
    raise exception 'Trabajo no encontrado';
  end if;

  v_resp := v_trabajo.responsable_user_id;

  if not (public.es_admin(auth.uid()) or v_resp = auth.uid()) then
    raise exception 'No autorizado';
  end if;

  if v_trabajo.orden_produccion_id is null then
    -- Conserva el comportamiento de trabajos históricos que todavía no
    -- pertenecen a una OP.
    update public.trabajos
    set estado = _nuevo_estado,
        fecha_inicio = case when _nuevo_estado = 'en_proceso' and fecha_inicio is null then now() else fecha_inicio end,
        fecha_fin = case when _nuevo_estado = 'completado' then now() else fecha_fin end,
        updated_at = now()
    where id = _trabajo_id;
    return;
  end if;

  select *
  into v_op
  from public.ordenes_produccion
  where id = v_trabajo.orden_produccion_id
  for update;

  if v_op.id is null then
    raise exception 'Orden de producción no encontrada';
  end if;

  if _nuevo_estado = 'en_proceso' then
    if v_op.estado <> 'en_produccion' then
      raise exception 'La orden de producción debe estar en producción para iniciar un trabajo';
    end if;

    if v_trabajo.estado not in ('pendiente','bloqueado') then
      raise exception 'Solo un trabajo pendiente o bloqueado puede iniciar';
    end if;

    if v_trabajo.secuencia is not null and exists (
      select 1
      from public.trabajos anterior
      where anterior.orden_produccion_id = v_trabajo.orden_produccion_id
        and anterior.estado <> 'cancelado'
        and anterior.secuencia is not null
        and anterior.secuencia < v_trabajo.secuencia
        and anterior.estado <> 'completado'
    ) then
      raise exception 'Esta operación está bloqueada: la operación anterior aún no está completada';
    end if;

    if exists (
      select 1
      from public.trabajos activo
      where activo.orden_produccion_id = v_trabajo.orden_produccion_id
        and activo.estado = 'en_proceso'
        and activo.id <> v_trabajo.id
    ) then
      raise exception 'Ya existe otra operación activa en esta orden';
    end if;
  elsif _nuevo_estado = 'completado' then
    if v_op.estado <> 'en_produccion' then
      raise exception 'La orden de producción debe estar en producción para completar un trabajo';
    end if;

    if v_trabajo.estado <> 'en_proceso' then
      raise exception 'Solo un trabajo en proceso puede completarse';
    end if;
  end if;

  update public.trabajos
  set estado = _nuevo_estado,
      fecha_inicio = case
        when _nuevo_estado = 'en_proceso' and fecha_inicio is null then now()
        else fecha_inicio
      end,
      fecha_fin = case
        when _nuevo_estado = 'completado' then now()
        when _nuevo_estado <> 'completado' then null
        else fecha_fin
      end,
      updated_at = now()
  where id = _trabajo_id;

  if _nuevo_estado = 'completado' then
    select *
    into v_siguiente
    from public.trabajos siguiente
    where siguiente.orden_produccion_id = v_trabajo.orden_produccion_id
      and siguiente.estado = 'pendiente'
      and (
        v_trabajo.secuencia is null
        or (siguiente.secuencia is not null and siguiente.secuencia > v_trabajo.secuencia)
      )
    order by
      case when v_trabajo.secuencia is null then 0 else 1 end,
      siguiente.secuencia nulls last,
      siguiente.created_at
    limit 1
    for update;

    if v_siguiente.id is not null then
      -- La siguiente operación pasa directamente a ejecución.
      update public.trabajos
      set estado = 'en_proceso',
          fecha_inicio = coalesce(fecha_inicio, now()),
          updated_at = now()
      where id = v_siguiente.id;

      select *
      into v_pedido
      from public.pedidos
      where id = v_op.pedido_id
      for update;

      update public.pedidos
      set area_actual = v_siguiente.area,
          area_desde = now(),
          updated_at = now()
      where id = v_op.pedido_id
        and estado not in ('Entregado','Cancelado');
    end if;
  end if;
end;
$$;

revoke all on function public.cambiar_estado_trabajo(uuid, text) from public, anon;
grant execute on function public.cambiar_estado_trabajo(uuid, text) to authenticated, service_role;

comment on function public.cambiar_estado_trabajo(uuid, text) is
  'Controla la secuencia de trabajos de una OP: solo una operación puede estar activa y completar una operación habilita automáticamente la siguiente.';
