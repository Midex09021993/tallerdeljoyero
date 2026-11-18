create or replace function public.mover_pedido_a_area(
  _pedido_id uuid,
  _destino text,
  _motivo text default null
)
returns table (
  pedido_id uuid,
  destino text,
  estado text,
  area_desde timestamptz,
  reinicia_flujo boolean
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_pedido public.pedidos%rowtype;
  v_origen text;
  v_destino text;
  v_ahora timestamptz := clock_timestamp();
  v_reinicia boolean;
  v_motivo text;
  v_updated integer;
begin
  if v_uid is null then
    raise exception using errcode = '42501', message = 'Sesión requerida para mover el pedido.';
  end if;

  if _pedido_id is null then
    raise exception using errcode = '22004', message = 'El pedido es obligatorio.';
  end if;

  v_destino := case lower(trim(coalesce(_destino, '')))
    when 'servicio láser' then 'Corte Láser'
    when 'corte láser' then 'Corte Láser'
    when 'corte laser' then 'Corte Láser'
    when 'taller / engaste' then 'Taller'
    when 'más alto' then 'Taller'
    when 'mas alto' then 'Taller'
    when 'ventas' then 'Área ventas'
    when 'área de ventas' then 'Área ventas'
    when 'terminado' then 'Área ventas'
    when 'entregado' then 'Área ventas'
    else trim(coalesce(_destino, ''))
  end;

  if v_destino not in (
    'Pedidos',
    'Diseño 3D',
    'Impresión 3D',
    'Casting',
    'Corte Láser',
    'Taller',
    'Área ventas'
  ) then
    raise exception using errcode = '22023', message = 'Área de destino no válida.';
  end if;

  select *
    into v_pedido
  from public.pedidos
  where id = _pedido_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Pedido no encontrado.';
  end if;

  if not public.ve_sede(v_uid, v_pedido.sede_id) then
    raise exception using errcode = '42501', message = 'No tienes acceso al pedido desde esta sede.';
  end if;

  if not (
    public.es_admin(v_uid)
    or public.has_role(v_uid, 'operario'::public.app_role)
    or public.has_role(v_uid, 'monitor'::public.app_role)
  ) then
    raise exception using errcode = '42501', message = 'No tienes permiso para mover pedidos.';
  end if;

  v_origen := case lower(trim(coalesce(v_pedido.area_actual, 'Pedidos')))
    when 'servicio láser' then 'Corte Láser'
    when 'corte láser' then 'Corte Láser'
    when 'corte laser' then 'Corte Láser'
    when 'taller / engaste' then 'Taller'
    when 'más alto' then 'Taller'
    when 'mas alto' then 'Taller'
    when 'ventas' then 'Área ventas'
    when 'área de ventas' then 'Área ventas'
    when 'terminado' then 'Área ventas'
    when 'entregado' then 'Área ventas'
    else trim(coalesce(v_pedido.area_actual, 'Pedidos'))
  end;

  if v_destino = v_origen then
    return query
      select v_pedido.id, v_destino, v_pedido.estado, v_pedido.area_desde, false;
    return;
  end if;

  v_reinicia := v_destino = 'Pedidos';
  v_motivo := case
    when v_reinicia then coalesce(nullif(trim(_motivo), ''), 'Retorno a Pedidos para reiniciar flujo operativo.')
    else coalesce(nullif(trim(_motivo), ''), '')
  end;

  if v_reinicia then
    update public.pedidos
    set
      area_actual = 'Pedidos',
      estado = 'Recibido',
      area_desde = v_ahora,
      ventas_estado = '',
      packing_estado = '',
      medio_envio = '',
      guia_envio = '',
      fecha_envio = null,
      fecha_entregado = null,
      fecha_listo_entrega = null,
      listo_entrega_observaciones = '',
      receptor_envio = '',
      notas_ventas = '',
      notas_envio = '',
      notas_entrega = '',
      usuario_listo_entrega = null,
      usuario_envio = null,
      usuario_entrega = null,
      ventas_actualizado_por = null,
      ventas_actualizado_en = null,
      enviado_at = null,
      entregado_at = null
    where id = _pedido_id;
  else
    update public.pedidos
    set
      area_actual = v_destino,
      estado = case when v_destino = 'Área ventas' then 'Listo para Entrega' else 'En Producción' end,
      area_desde = v_ahora
    where id = _pedido_id;
  end if;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception using errcode = '42501', message = 'No se pudo actualizar el pedido con los permisos actuales.';
  end if;

  insert into public.pedido_movimientos (
    pedido_id, area_origen, area_destino, accion, usuario_id, nota
  )
  values (
    v_pedido.id,
    v_origen,
    v_destino,
    case when v_reinicia then 'reiniciar_flujo' else 'mover' end,
    v_uid,
    v_motivo
  );

  return query
    select
      v_pedido.id,
      v_destino,
      case when v_reinicia then 'Recibido'
           when v_destino = 'Área ventas' then 'Listo para Entrega'
           else 'En Producción'
      end,
      v_ahora,
      v_reinicia;
end;
$$;

revoke execute on function public.mover_pedido_a_area(uuid, text, text) from public, anon;
grant execute on function public.mover_pedido_a_area(uuid, text, text) to authenticated;

comment on function public.mover_pedido_a_area(uuid, text, text) is
  'Mueve un pedido y registra su historial en una sola transacción, usando la identidad autenticada del usuario.';
