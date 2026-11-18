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
begin
  if not public.es_admin(auth.uid()) then raise exception 'No autorizado'; end if;
  select * into v_cot from public.cotizaciones where id = _cotizacion_id for update;
  if not found then raise exception 'Cotización no encontrada'; end if;
  if v_cot.estado <> 'aprobada' then raise exception 'Solo se puede convertir una cotización aprobada'; end if;
  select id into v_existente from public.pedidos where cotizacion_id = _cotizacion_id limit 1;
  if v_existente is not null then return v_existente; end if;
  select * into v_cliente from public.clientes where id = v_cot.cliente_id;
  if not found then raise exception 'Cliente de la cotización no encontrado'; end if;
  if v_cot.proyecto_joya_id is not null then
    select * into v_proyecto from public.proyectos_joya where id = v_cot.proyecto_joya_id;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id, 'orden', d.orden, 'tipo', d.tipo, 'descripcion', d.descripcion,
    'cantidad', d.cantidad, 'unidad', d.unidad, 'precio_unitario', d.precio_unitario,
    'total_precio', d.total_precio, 'metadata', d.metadata
  ) order by d.orden), '[]'::jsonb)
  into v_detalles
  from public.cotizacion_detalles d where d.cotizacion_id = v_cot.id;

  v_especificaciones := jsonb_build_object(
    'cotizacion_numero',v_cot.numero,'cotizacion_version',v_cot.version,'moneda',v_cot.moneda,
    'subtotal',v_cot.subtotal,'descuento',v_cot.descuento,'impuestos',v_cot.impuestos,'total',v_cot.total,
    'anticipo',v_cot.anticipo,'notas_cliente',v_cot.notas_cliente,'identidad_comercial',v_cot.identidad_comercial
  );

  select coalesce(max(case when referencia ~ '^PED-[0-9]{4}-[0-9]+$'
    then substring(referencia from 10)::integer else 0 end),0)+1
  into v_referencia
  from public.pedidos where sede_id is not distinct from v_cot.sede_id;

  v_referencia := 'PED-' || to_char(current_date,'YYYY') || '-' || lpad(v_referencia::text,5,'0');

  insert into public.pedidos (
    referencia,pieza,cliente,cliente_id,material,estado,entrega,sede_id,origen,contrato,
    trabajo,fecha_ingreso,fecha_entrega,area_actual,ruta,notas,talla,cantidad_piezas,piedras,peso_estimado,
    cotizacion_id,proyecto_joya_id
  ) values (
    v_referencia,coalesce(nullif(v_proyecto.nombre,''),'Pedido desde '||v_cot.numero),v_cliente.nombre,v_cliente.id,
    coalesce(v_proyecto.metal,''),'Recibido',coalesce(v_cot.fecha_vencimiento::text,''),v_cot.sede_id,
    'Cotización '||v_cot.numero||' v'||v_cot.version,'',
    coalesce(nullif(v_proyecto.nombre,''),'Servicio de joyería'),current_date,v_cot.fecha_vencimiento,'Pedidos',
    ARRAY['Pedidos']::text[],coalesce(v_cot.notas_internas,''),coalesce(v_proyecto.talla,''),
    coalesce(v_proyecto.cantidad_piezas,1),coalesce(v_proyecto.piedras,''),coalesce(v_proyecto.peso_estimado::text,''),
    v_cot.id,v_cot.proyecto_joya_id
  )
  returning id into v_pedido_id;

  insert into public.pedido_comercial (
    pedido_id, telefono, importe, cotizacion_detalles, especificaciones_comerciales
  ) values (
    v_pedido_id, coalesce(v_cliente.telefono,''), coalesce(v_cot.total,0), v_detalles, v_especificaciones
  );

  return v_pedido_id;
end;
$function$;

revoke all on table public.pedidos from anon, authenticated;

grant select (
  id, referencia, pieza, cliente, cliente_id, material, estado, entrega, sede_id, origen,
  contrato, contrato_id, cotizacion_id, proyecto_joya_id, trabajo, fecha_ingreso, fecha_entrega,
  area_actual, ruta, area_desde, notas, talla, cantidad_piezas, piedras, peso_estimado,
  created_at, updated_at
) on table public.pedidos to authenticated;

grant insert (
  id, referencia, pieza, cliente, cliente_id, material, estado, entrega, sede_id, origen,
  contrato, contrato_id, cotizacion_id, proyecto_joya_id, trabajo, fecha_ingreso, fecha_entrega,
  area_actual, ruta, area_desde, notas, talla, cantidad_piezas, piedras, peso_estimado
) on table public.pedidos to authenticated;

grant update (
  referencia, pieza, cliente, cliente_id, material, estado, entrega, sede_id, origen,
  contrato, contrato_id, cotizacion_id, proyecto_joya_id, trabajo, fecha_ingreso, fecha_entrega,
  area_actual, ruta, area_desde, notas, talla, cantidad_piezas, piedras, peso_estimado, updated_at
) on table public.pedidos to authenticated;

grant delete on table public.pedidos to authenticated;
