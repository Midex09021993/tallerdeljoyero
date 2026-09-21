-- Preparación atómica de producción desde Pedidos 2.
-- Crea una única OP por pedido, sus trabajos según la ruta y las piezas requeridas.
create or replace function public.preparar_produccion_pedido(_pedido_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_pedido public.pedidos;
  v_op public.ordenes_produccion;
  v_ruta jsonb;
  v_area text;
  v_secuencia integer := 0;
  v_cantidad integer;
  v_peso numeric;
  v_usuario uuid := auth.uid();
begin
  select * into v_pedido
  from public.pedidos
  where id=_pedido_id
  for update;

  if v_pedido.id is null then
    raise exception 'Pedido no encontrado';
  end if;

  if not public.ve_sede(v_usuario,v_pedido.sede_id) then
    raise exception 'No tienes acceso al taller de este pedido';
  end if;

  if not (public.es_admin(v_usuario) or public.has_role(v_usuario,'operario') or public.has_role(v_usuario,'monitor')) then
    raise exception 'No tienes permisos para preparar producción';
  end if;

  if exists (select 1 from public.ordenes_produccion where pedido_id=_pedido_id) then
    raise exception 'Este pedido ya tiene una orden de producción';
  end if;

  v_ruta := coalesce(v_pedido.ruta,'[]'::jsonb);
  if jsonb_typeof(v_ruta) <> 'array' or jsonb_array_length(v_ruta)=0 then
    raise exception 'El pedido no tiene una ruta de fabricación definida';
  end if;

  v_cantidad := greatest(coalesce(v_pedido.cantidad_piezas,1),1);

  if nullif(regexp_replace(replace(coalesce(v_pedido.peso_estimado,''),',','.'),'[^0-9.]','','g'),'') is not null
     and regexp_replace(replace(coalesce(v_pedido.peso_estimado,''),',','.'),'[^0-9.]','','g') ~ '^\d+(\.\d+)?$' then
    v_peso := regexp_replace(replace(v_pedido.peso_estimado,',','.'),'[^0-9.]','','g')::numeric;
  end if;

  insert into public.ordenes_produccion(
    pedido_id,sede_id,numero,estado,prioridad,creado_por,notas
  )
  values(
    v_pedido.id,
    v_pedido.sede_id,
    'OP-' || v_pedido.referencia,
    'borrador',
    'normal',
    v_usuario,
    coalesce(v_pedido.notas,'')
  )
  returning * into v_op;

  for v_area in
    select trim(value)
    from jsonb_array_elements_text(v_ruta)
    where lower(trim(value)) <> 'área ventas'
  loop
    v_secuencia := v_secuencia + 1;
    insert into public.trabajos(
      pedido_id,orden_produccion_id,sede_id,secuencia,area,ubicacion,
      titulo,descripcion,estado,prioridad,tipo,fecha_planificada,notas
    )
    values(
      v_pedido.id,
      v_op.id,
      v_pedido.sede_id,
      v_secuencia,
      trim(v_area),
      trim(v_area),
      trim(v_area) || ' · ' || coalesce(nullif(v_pedido.trabajo,''),v_pedido.pieza,'Trabajo'),
      'Operación generada desde la ruta de fabricación del pedido.',
      'pendiente',
      'normal',
      'interno',
      v_pedido.fecha_entrega,
      ''
    );
  end loop;

  if v_secuencia = 0 then
    raise exception 'La ruta del pedido no contiene operaciones de fabricación';
  end if;

  insert into public.piezas_terminadas(
    orden_produccion_id,pedido_id,numero_pieza,cantidad,
    peso_estimado,metal_estimado,piedras_estimadas,estado,registrado_por,observaciones
  )
  values(
    v_op.id,
    v_pedido.id,
    'Pieza 1',
    v_cantidad,
    v_peso,
    coalesce(v_pedido.material,''),
    coalesce(v_pedido.piedras,''),
    'pendiente',
    v_usuario,
    'Pieza generada al preparar la producción.'
  );

  return jsonb_build_object(
    'orden_produccion_id',v_op.id,
    'numero',v_op.numero,
    'trabajos',v_secuencia,
    'piezas',v_cantidad,
    'estado',v_op.estado
  );
end;
$$;

revoke all on function public.preparar_produccion_pedido(uuid) from public,anon;
grant execute on function public.preparar_produccion_pedido(uuid) to authenticated;
