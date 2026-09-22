-- Pedidos 2: los pedidos creados desde una cotización no reciben
-- una ruta operativa implícita. La ruta se define en la ficha del pedido.
-- Los pedidos manuales ya exigen ruta desde la interfaz de creación.

create or replace function public.convertir_cotizacion_a_pedido(_cotizacion_id uuid)
returns uuid
language plpgsql
set search_path = public
as $function$
declare
  v_cot public.cotizaciones%rowtype;
  v_cliente public.clientes%rowtype;
  v_proyecto public.proyectos_joya%rowtype;
  v_pedido_id uuid;
  v_referencia text;
  v_existente uuid;
  v_detalles jsonb;
  v_sede_text text;
  v_next bigint;
begin
  if not public.es_admin(auth.uid()) then raise exception 'No autorizado'; end if;
  select * into v_cot from public.cotizaciones where id = _cotizacion_id for update;
  if not found then raise exception 'Cotización no encontrada'; end if;
  if v_cot.estado <> 'aprobada' then raise exception 'Solo se puede convertir una cotización aprobada'; end if;
  select id into v_existente from public.pedidos where cotizacion_id = _cotizacion_id limit 1;
  if v_existente is not null then return v_existente; end if;
  select * into v_cliente from public.clientes where id = v_cot.cliente_id;
  if not found then raise exception 'Cliente de la cotización no encontrado'; end if;
  if v_cot.proyecto_joya_id is not null then select * into v_proyecto from public.proyectos_joya where id = v_cot.proyecto_joya_id; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'orden',d.orden,'tipo',d.tipo,'descripcion',d.descripcion,'cantidad',d.cantidad,'unidad',d.unidad,'precio_unitario',d.precio_unitario,'total_precio',d.total_precio,'metadata',d.metadata) order by d.orden),'[]'::jsonb) into v_detalles from public.cotizacion_detalles d where d.cotizacion_id=v_cot.id;
  v_sede_text := coalesce(v_cot.sede_id::text,'global');
  perform pg_advisory_xact_lock(hashtext('pedido:'||v_sede_text));
  select coalesce(max(case when referencia ~ ('^PED-'||to_char(current_date,'YYYY')||'-[0-9]+$') then substring(referencia from 10)::bigint else 0 end),0)+1 into v_next from public.pedidos where sede_id is not distinct from v_cot.sede_id;
  v_referencia := 'PED-'||to_char(current_date,'YYYY')||'-'||lpad(v_next::text,5,'0');

  insert into public.pedidos (
    referencia,pieza,cliente,material,estado,entrega,importe,sede_id,telefono,origen,contrato,
    trabajo,fecha_ingreso,fecha_entrega,area_actual,ruta,notas,talla,cantidad_piezas,piedras,
    peso_estimado,cotizacion_id,proyecto_joya_id,cotizacion_detalles,especificaciones_comerciales
  )
  values (
    v_referencia,
    coalesce(nullif(v_proyecto.nombre,''),'Pedido desde '||v_cot.numero),
    v_cliente.nombre,
    coalesce(v_proyecto.metal,''),
    'Recibido',
    coalesce(v_cot.fecha_entrega_solicitada::text,''),
    v_cot.total,
    v_cot.sede_id,
    coalesce(v_cliente.telefono,''),
    'Cotización '||v_cot.numero||' v'||v_cot.version,
    '',
    coalesce(nullif(v_proyecto.nombre,''),'Servicio de joyería'),
    current_date,
    v_cot.fecha_entrega_solicitada,
    'Pedidos',
    ARRAY[]::text[],
    coalesce(v_cot.notas_internas,''),
    coalesce(v_proyecto.talla,''),
    coalesce(v_proyecto.cantidad_piezas,1),
    coalesce(v_proyecto.piedras,''),
    coalesce(v_proyecto.peso_estimado::text,''),
    v_cot.id,
    v_cot.proyecto_joya_id,
    v_detalles,
    jsonb_build_object(
      'cotizacion_numero',v_cot.numero,
      'cotizacion_version',v_cot.version,
      'moneda',v_cot.moneda,
      'subtotal',v_cot.subtotal,
      'descuento',v_cot.descuento,
      'impuestos',v_cot.impuestos,
      'total',v_cot.total,
      'anticipo',v_cot.anticipo,
      'notas_cliente',v_cot.notas_cliente,
      'identidad_comercial',v_cot.identidad_comercial
    )
  )
  returning id into v_pedido_id;
  return v_pedido_id;
end;
$function$;

-- Si un pedido proviene de una cotización y todavía no tiene ruta,
-- no se debe fabricar por defecto en Taller: primero debe definirse la ruta.
create or replace function public.preparar_produccion_pedido(_pedido_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pedido public.pedidos;
  v_op public.ordenes_produccion;
  v_area text;
  v_ruta text[];
  v_secuencia integer := 0;
  v_trabajos integer := 0;
  v_piezas integer := 0;
  v_cantidad integer;
  v_peso numeric;
  v_numero text;
  v_ya_existia boolean := false;
  v_peso_text text;
  i integer;
begin
  if v_uid is null then raise exception 'Sesión no válida'; end if;

  select * into v_pedido from public.pedidos where id = _pedido_id for update;
  if v_pedido.id is null then raise exception 'Pedido no encontrado'; end if;
  if not public.ve_sede(v_uid, v_pedido.sede_id) then raise exception 'No tienes acceso al taller de este pedido'; end if;
  if not (public.es_admin(v_uid) or public.has_role(v_uid, 'operario') or public.has_role(v_uid, 'monitor')) then
    raise exception 'No tienes permisos para preparar producción';
  end if;

  v_ruta := coalesce(v_pedido.ruta, array[]::text[]);
  v_ruta := array(
    select trim(x)
    from unnest(v_ruta) x
    where trim(x) <> ''
      and lower(trim(x)) not in ('pedidos','área ventas','area ventas','ventas','terminado','entregado')
  );

  if coalesce(array_length(v_ruta, 1), 0) = 0 and v_pedido.cotizacion_id is not null then
    raise exception 'Define la ruta de fabricación antes de preparar la producción de este pedido';
  end if;

  if coalesce(array_length(v_ruta, 1), 0) = 0 then
    v_ruta := array['Taller']::text[];
  end if;

  select * into v_op
  from public.ordenes_produccion
  where pedido_id = _pedido_id
  order by created_at
  limit 1
  for update;

  if v_op.id is not null then
    v_ya_existia := true;
  else
    perform pg_advisory_xact_lock(hashtext('preparar-produccion:' || _pedido_id::text));
    select * into v_op from public.ordenes_produccion where pedido_id = _pedido_id limit 1 for update;

    if v_op.id is null then
      perform pg_advisory_xact_lock(hashtext('numero-op:' || to_char(current_date, 'YYYY')));
      select 'OP-' || to_char(current_date, 'YYYY') || '-' ||
             lpad((coalesce(max(case when numero ~ ('^OP-' || to_char(current_date, 'YYYY') || '-[0-9]+$')
             then substring(numero from 9)::bigint else 0 end), 0) + 1)::text, 5, '0')
      into v_numero from public.ordenes_produccion;

      insert into public.ordenes_produccion (pedido_id, sede_id, numero, estado, prioridad, creado_por, notas)
      values (v_pedido.id, v_pedido.sede_id, v_numero, 'borrador', 'normal', v_uid, coalesce(v_pedido.notas, ''))
      returning * into v_op;
    end if;
  end if;

  update public.trabajos set orden_produccion_id = v_op.id
  where pedido_id = _pedido_id and orden_produccion_id is null;

  select count(*) into v_trabajos from public.trabajos where orden_produccion_id = v_op.id;

  if v_trabajos = 0 then
    foreach v_area in array v_ruta loop
      v_secuencia := v_secuencia + 1;
      insert into public.trabajos (
        pedido_id, orden_produccion_id, sede_id, secuencia, area, ubicacion,
        titulo, descripcion, estado, prioridad, tipo, fecha_planificada, notas
      )
      values (
        v_pedido.id, v_op.id, v_pedido.sede_id, v_secuencia, v_area, v_area,
        v_area || ' · ' || coalesce(nullif(v_pedido.trabajo, ''), nullif(v_pedido.pieza, ''), 'Trabajo'),
        'Operación generada desde la ruta de fabricación del pedido.',
        'pendiente', 'normal', 'interno', v_pedido.fecha_entrega, ''
      );
    end loop;
    v_trabajos := v_secuencia;
  end if;

  if v_trabajos = 0 then raise exception 'No se pudo generar ninguna operación de fabricación'; end if;

  v_cantidad := greatest(coalesce(v_pedido.cantidad_piezas, 1), 1);
  v_peso_text := nullif(trim(v_pedido.peso_estimado::text), '');
  if v_peso_text is not null then
    v_peso_text := replace(v_peso_text, ',', '.');
    if v_peso_text ~ '^\d+(\.\d+)?$' then v_peso := v_peso_text::numeric; end if;
  end if;

  select count(*) into v_piezas from public.piezas_terminadas where orden_produccion_id = v_op.id;
  if v_piezas = 0 then
    for i in 1..v_cantidad loop
      insert into public.piezas_terminadas (
        orden_produccion_id, pedido_id, numero_pieza, cantidad, peso_estimado,
        metal_estimado, piedras_estimadas, estado, registrado_por, observaciones
      )
      values (
        v_op.id, v_pedido.id, v_op.numero || '-' || lpad(i::text, 2, '0'), 1,
        case when v_cantidad = 1 then v_peso else null end,
        coalesce(v_pedido.material, ''), coalesce(v_pedido.piedras, ''),
        'pendiente', v_uid, 'Pieza generada al preparar la producción.'
      );
    end loop;
    v_piezas := v_cantidad;
  end if;

  return jsonb_build_object(
    'orden_id', v_op.id,
    'orden_produccion_id', v_op.id,
    'numero', v_op.numero,
    'trabajos', v_trabajos,
    'piezas', v_piezas,
    'cantidad_requerida', v_cantidad,
    'estado', v_op.estado,
    'ya_existia', v_ya_existia
  );
end;
$$;

revoke all on function public.preparar_produccion_pedido(uuid) from public, anon;
grant execute on function public.preparar_produccion_pedido(uuid) to authenticated, service_role;
