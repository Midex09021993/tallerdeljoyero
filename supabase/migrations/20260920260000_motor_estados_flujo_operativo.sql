-- Motor de estados del flujo operativo.
-- La base de datos es la autoridad: la UI no puede saltarse las puertas de producción/calidad/entrega.

create or replace function public.transicionar_orden_produccion(
  _orden_id uuid,
  _nuevo_estado text
) returns public.ordenes_produccion
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_op public.ordenes_produccion;
  v_pedido public.pedidos;
  v_trabajos_total int;
  v_trabajos_completados int;
  v_calidad_aprobada boolean;
  v_pieza_liberada boolean;
begin
  select * into v_op from public.ordenes_produccion where id=_orden_id for update;
  if v_op.id is null then raise exception 'Orden de producción no encontrada'; end if;
  if not public.ve_sede((select auth.uid()), v_op.sede_id) then raise exception 'No tienes acceso a esta orden'; end if;

  select * into v_pedido from public.pedidos where id=v_op.pedido_id;
  if v_pedido.id is null or v_pedido.sede_id <> v_op.sede_id then raise exception 'Pedido y orden no pertenecen a la misma sede'; end if;

  if _nuevo_estado not in ('borrador','liberada','en_produccion','pausada','control_calidad','terminada','cancelada')
    then raise exception 'Estado de OP no válido'; end if;

  if _nuevo_estado = v_op.estado then return v_op; end if;

  if _nuevo_estado = 'liberada' and v_op.estado <> 'borrador'
    then raise exception 'Solo una OP en borrador puede liberarse'; end if;

  if _nuevo_estado = 'en_produccion' and v_op.estado not in ('liberada','pausada')
    then raise exception 'La OP debe estar liberada o pausada para entrar en producción'; end if;

  if _nuevo_estado = 'pausada' and v_op.estado <> 'en_produccion'
    then raise exception 'Solo una OP en producción puede pausarse'; end if;

  if _nuevo_estado = 'control_calidad' and v_op.estado <> 'en_produccion'
    then raise exception 'La OP debe estar en producción para pasar a calidad'; end if;

  if _nuevo_estado = 'control_calidad' then
    select count(*), count(*) filter (where estado='completado')
      into v_trabajos_total,v_trabajos_completados
    from public.trabajos where orden_produccion_id=_orden_id;
    if v_trabajos_total > 0 and v_trabajos_completados < v_trabajos_total
      then raise exception 'No se puede pasar a calidad: hay trabajos pendientes'; end if;
  end if;

  if _nuevo_estado = 'terminada' then
    select exists(
      select 1 from public.control_calidad
      where orden_produccion_id=_orden_id
        and tipo='inspeccion_final'
        and resultado='aprobado'
    ) into v_calidad_aprobada;
    if not v_calidad_aprobada then raise exception 'La OP necesita una inspección final aprobada'; end if;

    select exists(
      select 1 from public.piezas_terminadas
      where orden_produccion_id=_orden_id and estado in ('liberada','verificada')
    ) into v_pieza_liberada;
    if not v_pieza_liberada then raise exception 'La OP necesita al menos una pieza verificada o liberada'; end if;
  end if;

  if _nuevo_estado='cancelada' and v_op.estado='terminada'
    then raise exception 'Una OP terminada no puede cancelarse'; end if;

  update public.ordenes_produccion
  set estado=_nuevo_estado,
      fecha_inicio=case when _nuevo_estado='en_produccion' then coalesce(fecha_inicio,now()) else fecha_inicio end,
      fecha_fin=case when _nuevo_estado='terminada' then coalesce(fecha_fin,now()) else fecha_fin end,
      updated_at=now()
  where id=_orden_id
  returning * into v_op;

  -- El pedido solo avanza a producción cuando la OP realmente entra en producción.
  if _nuevo_estado='en_produccion' then
    update public.pedidos
    set estado='En Producción',
        area_actual=coalesce(nullif(area_actual,''),'Pedidos'),
        updated_at=now()
    where id=v_op.pedido_id and estado not in ('Entregado','Cancelado');
  elsif _nuevo_estado='terminada' then
    update public.pedidos
    set estado='Listo para Entrega',
        area_actual='Área ventas',
        fecha_listo_entrega=coalesce(fecha_listo_entrega,now()),
        updated_at=now()
    where id=v_op.pedido_id and estado not in ('Entregado','Cancelado');
  elsif _nuevo_estado='cancelada' then
    update public.pedidos
    set estado='Cancelado', updated_at=now()
    where id=v_op.pedido_id and estado <> 'Entregado';
  end if;

  return v_op;
end;
$$;

revoke all on function public.transicionar_orden_produccion(uuid,text) from public,anon;
grant execute on function public.transicionar_orden_produccion(uuid,text) to authenticated;

-- La liberación final existente ya no debe aceptar una aprobación parcial como cierre.
create or replace function public.validar_liberacion_calidad_op()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_sede uuid;
begin
  select sede_id into v_sede from public.ordenes_produccion where id=new.orden_produccion_id;
  if not public.ve_sede((select auth.uid()), v_sede) then
    raise exception 'No tienes acceso a la orden de producción';
  end if;

  if new.resultado='aprobado' and new.tipo='inspeccion_final' then
    -- Solo mueve la OP a terminada si la puerta de pieza terminada ya está satisfecha.
    if exists (
      select 1 from public.piezas_terminadas
      where orden_produccion_id=new.orden_produccion_id
        and estado in ('liberada','verificada')
    ) then
      update public.ordenes_produccion
      set estado='terminada', fecha_fin=coalesce(fecha_fin,now()), updated_at=now()
      where id=new.orden_produccion_id and estado='control_calidad';

      update public.pedidos p
      set estado='Listo para Entrega',
          area_actual='Área ventas',
          fecha_listo_entrega=coalesce(p.fecha_listo_entrega,now()),
          updated_at=now()
      where p.id=(select pedido_id from public.ordenes_produccion where id=new.orden_produccion_id)
        and p.estado not in ('Entregado','Cancelado');
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.validar_liberacion_calidad_op() from public,anon,authenticated;