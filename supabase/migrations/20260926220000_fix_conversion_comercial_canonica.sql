-- Reafirma la conversión Cotización -> Pedido sobre la fuente comercial canónica.
-- Regla: pedido_comercial es la fuente canónica de importes y snapshot comercial.
-- No registra pagos automáticamente: el anticipo de la cotización queda en el snapshot.
-- La conversión es idempotente y repara el registro comercial si el pedido ya existe.

create or replace function public.convertir_cotizacion_a_pedido(_cotizacion_id uuid)
returns uuid
language plpgsql
security invoker
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
  v_especificaciones jsonb;
  v_sede_text text;
  v_next bigint;
begin
  if not public.es_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  select *
  into v_cot
  from public.cotizaciones
  where id = _cotizacion_id
  for update;

  if not found then
    raise exception 'Cotización no encontrada';
  end if;

  if v_cot.estado <> 'aprobada' then
    raise exception 'Solo se puede convertir una cotización aprobada';
  end if;

  select *
  into v_cliente
  from public.clientes
  where id = v_cot.cliente_id;

  if not found then
    raise exception 'Cliente de la cotización no encontrado';
  end if;

  if v_cot.proyecto_joya_id is not null then
    select *
    into v_proyecto
    from public.proyectos_joya
    where id = v_cot.proyecto_joya_id;
  end if;

  select id
  into v_existente
  from public.pedidos
  where cotizacion_id = _cotizacion_id
  limit 1;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'orden', d.orden,
        'tipo', d.tipo,
        'descripcion', d.descripcion,
        'cantidad', d.cantidad,
        'unidad', d.unidad,
        'precio_unitario', d.precio_unitario,
        'total_precio', d.total_precio,
        'metadata', d.metadata
      )
      order by d.orden
    ),
    '[]'::jsonb
  )
  into v_detalles
  from public.cotizacion_detalles d
  where d.cotizacion_id = v_cot.id;

  v_especificaciones := jsonb_build_object(
    'cotizacion_numero', v_cot.numero,
    'cotizacion_version', v_cot.version,
    'moneda', v_cot.moneda,
    'subtotal', coalesce(v_cot.subtotal, 0),
    'descuento', coalesce(v_cot.descuento, 0),
    'impuestos', coalesce(v_cot.impuestos, 0),
    'total', coalesce(v_cot.total, 0),
    'anticipo', coalesce(v_cot.anticipo, 0),
    'notas_cliente', coalesce(v_cot.notas_cliente, ''),
    'identidad_comercial', v_cot.identidad_comercial
  );

  -- Si el pedido ya existe, no lo duplicamos. Solo garantizamos que su
  -- información comercial canónica exista y refleje la cotización origen.
  if v_existente is not null then
    insert into public.pedido_comercial (
      pedido_id,
      telefono,
      importe,
      a_cuenta,
      saldo,
      cotizacion_detalles,
      especificaciones_comerciales
    )
    values (
      v_existente,
      coalesce(v_cliente.telefono, ''),
      greatest(0, coalesce(v_cot.total, 0)),
      0,
      greatest(0, coalesce(v_cot.total, 0)),
      v_detalles,
      v_especificaciones
    )
    on conflict (pedido_id) do update set
      telefono = excluded.telefono,
      importe = excluded.importe,
      cotizacion_detalles = excluded.cotizacion_detalles,
      especificaciones_comerciales = excluded.especificaciones_comerciales;

    update public.pedidos
    set
      cotizacion_id = v_cot.id,
      proyecto_joya_id = v_cot.proyecto_joya_id,
      origen_comercial = 'cotizacion',
      updated_at = now()
    where id = v_existente;

    return v_existente;
  end if;

  v_sede_text := coalesce(v_cot.sede_id::text, 'global');
  perform pg_advisory_xact_lock(hashtext('pedido:' || v_sede_text));

  select coalesce(
    max(
      case
        when referencia ~ ('^PED-' || to_char(current_date, 'YYYY') || '-[0-9]+$')
        then substring(referencia from 10)::bigint
        else 0
      end
    ),
    0
  ) + 1
  into v_next
  from public.pedidos
  where sede_id is not distinct from v_cot.sede_id;

  v_referencia :=
    'PED-' || to_char(current_date, 'YYYY') || '-' || lpad(v_next::text, 5, '0');

  insert into public.pedidos (
    referencia,
    pieza,
    cliente,
    cliente_id,
    material,
    estado,
    entrega,
    importe,
    sede_id,
    telefono,
    origen,
    contrato,
    trabajo,
    fecha_ingreso,
    fecha_entrega,
    area_actual,
    ruta,
    notas,
    talla,
    cantidad_piezas,
    piedras,
    peso_estimado,
    cotizacion_id,
    proyecto_joya_id,
    cotizacion_detalles,
    especificaciones_comerciales,
    origen_comercial
  )
  values (
    v_referencia,
    coalesce(nullif(v_proyecto.nombre, ''), 'Pedido desde ' || v_cot.numero),
    v_cliente.nombre,
    v_cliente.id,
    coalesce(v_proyecto.metal, ''),
    'Recibido',
    coalesce(v_cot.fecha_entrega_solicitada::text, ''),
    greatest(0, coalesce(v_cot.total, 0)),
    v_cot.sede_id,
    coalesce(v_cliente.telefono, ''),
    'Cotización ' || v_cot.numero || ' v' || v_cot.version,
    '',
    coalesce(nullif(v_proyecto.nombre, ''), 'Servicio de joyería'),
    current_date,
    v_cot.fecha_entrega_solicitada,
    'Pedidos',
    ARRAY['Pedidos']::text[],
    coalesce(v_cot.notas_internas, ''),
    coalesce(v_proyecto.talla, ''),
    coalesce(v_proyecto.cantidad_piezas, 1),
    coalesce(v_proyecto.piedras, ''),
    coalesce(v_proyecto.peso_estimado::text, ''),
    v_cot.id,
    v_cot.proyecto_joya_id,
    v_detalles,
    v_especificaciones,
    'cotizacion'
  )
  returning id into v_pedido_id;

  insert into public.pedido_comercial (
    pedido_id,
    telefono,
    importe,
    a_cuenta,
    saldo,
    cotizacion_detalles,
    especificaciones_comerciales
  )
  values (
    v_pedido_id,
    coalesce(v_cliente.telefono, ''),
    greatest(0, coalesce(v_cot.total, 0)),
    0,
    greatest(0, coalesce(v_cot.total, 0)),
    v_detalles,
    v_especificaciones
  )
  on conflict (pedido_id) do update set
    telefono = excluded.telefono,
    importe = excluded.importe,
    cotizacion_detalles = excluded.cotizacion_detalles,
    especificaciones_comerciales = excluded.especificaciones_comerciales;

  return v_pedido_id;
end;
$function$;

comment on function public.convertir_cotizacion_a_pedido(uuid)
is 'Convierte una cotización aprobada en pedido de forma idempotente y garantiza pedido_comercial como fuente canónica del snapshot económico/comercial, sin registrar pagos.';

-- La función wrapper de contrato ya usa convertir_cotizacion_a_pedido().
-- Se mantiene separada para no duplicar la lógica comercial.
