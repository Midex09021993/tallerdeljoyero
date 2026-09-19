-- Reproduce las funciones finales del flujo Cotización -> Pedido / Contrato.
-- Incluye bloqueo transaccional de numeración y recuperación de pedidos faltantes.

create or replace function public.convertir_cotizacion_a_pedido(_cotizacion_id uuid)
returns uuid language plpgsql set search_path = public
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
  insert into public.pedidos (referencia,pieza,cliente,material,estado,entrega,importe,sede_id,telefono,origen,contrato,trabajo,fecha_ingreso,fecha_entrega,area_actual,ruta,notas,talla,cantidad_piezas,piedras,peso_estimado,cotizacion_id,proyecto_joya_id,cotizacion_detalles,especificaciones_comerciales)
  values (v_referencia,coalesce(nullif(v_proyecto.nombre,''),'Pedido desde '||v_cot.numero),v_cliente.nombre,coalesce(v_proyecto.metal,''),'Recibido',coalesce(v_cot.fecha_entrega_solicitada::text,''),v_cot.total,v_cot.sede_id,coalesce(v_cliente.telefono,''),'Cotización '||v_cot.numero||' v'||v_cot.version,'',coalesce(nullif(v_proyecto.nombre,''),'Servicio de joyería'),current_date,v_cot.fecha_entrega_solicitada,'Pedidos',ARRAY['Pedidos']::text[],coalesce(v_cot.notas_internas,''),coalesce(v_proyecto.talla,''),coalesce(v_proyecto.cantidad_piezas,1),coalesce(v_proyecto.piedras,''),coalesce(v_proyecto.peso_estimado::text,''),v_cot.id,v_cot.proyecto_joya_id,v_detalles,jsonb_build_object('cotizacion_numero',v_cot.numero,'cotizacion_version',v_cot.version,'moneda',v_cot.moneda,'subtotal',v_cot.subtotal,'descuento',v_cot.descuento,'impuestos',v_cot.impuestos,'total',v_cot.total,'anticipo',v_cot.anticipo,'notas_cliente',v_cot.notas_cliente,'identidad_comercial',v_cot.identidad_comercial))
  returning id into v_pedido_id;
  return v_pedido_id;
end;
$function$;

create or replace function public.convertir_cotizacion_a_pedido_contrato(_cotizacion_id uuid)
returns jsonb language plpgsql security invoker set search_path = public
as $function$
declare
  v_cot public.cotizaciones%rowtype; v_cliente public.clientes%rowtype; v_contrato_id uuid; v_contrato_numero text; v_pedido_id uuid; v_existente_contrato uuid; v_next bigint;
begin
  if not public.es_admin(auth.uid()) then raise exception 'No autorizado'; end if;
  select * into v_cot from public.cotizaciones where id=_cotizacion_id for update;
  if not found then raise exception 'Cotización no encontrada'; end if;
  if v_cot.estado <> 'aprobada' then raise exception 'Solo se puede convertir una cotización aprobada'; end if;
  select * into v_cliente from public.clientes where id=v_cot.cliente_id;
  if not found then raise exception 'Cliente de la cotización no encontrado'; end if;
  select id into v_existente_contrato from public.contratos where cotizacion_id=_cotizacion_id limit 1;
  if v_existente_contrato is not null then
    select id into v_pedido_id from public.pedidos where cotizacion_id=_cotizacion_id limit 1;
    if v_pedido_id is null then
      v_pedido_id := public.convertir_cotizacion_a_pedido(_cotizacion_id);
      update public.pedidos set contrato_id=v_existente_contrato, contrato=(select numero from public.contratos where id=v_existente_contrato), updated_at=now() where id=v_pedido_id;
    end if;
    return jsonb_build_object('pedido_id',v_pedido_id,'contrato_id',v_existente_contrato,'contrato_numero',(select numero from public.contratos where id=v_existente_contrato));
  end if;
  perform pg_advisory_xact_lock(hashtext('contrato:global'));
  select coalesce(max(case when numero ~ ('^CTR-'||to_char(current_date,'YYYY')||'-[0-9]+$') then substring(numero from 10)::bigint else 0 end),0)+1 into v_next from public.contratos;
  v_contrato_numero := 'CTR-'||to_char(current_date,'YYYY')||'-'||lpad(v_next::text,5,'0');
  insert into public.contratos (numero,cliente,telefono,origen,total,abonado,saldo,sede_id,notas,cotizacion_id)
  values (v_contrato_numero,v_cliente.nombre,coalesce(v_cliente.telefono,''),'Cotización '||v_cot.numero||' v'||v_cot.version,greatest(0,coalesce(v_cot.total,0)),0,greatest(0,coalesce(v_cot.total,0)),v_cot.sede_id,coalesce(v_cot.notas_internas,''),_cotizacion_id)
  returning id into v_contrato_id;
  v_pedido_id := public.convertir_cotizacion_a_pedido(_cotizacion_id);
  update public.pedidos set contrato_id=v_contrato_id, contrato=v_contrato_numero, updated_at=now() where id=v_pedido_id;
  return jsonb_build_object('pedido_id',v_pedido_id,'contrato_id',v_contrato_id,'contrato_numero',v_contrato_numero);
end;
$function$;
