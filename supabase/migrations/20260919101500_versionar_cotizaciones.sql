create or replace function public.crear_version_cotizacion(_cotizacion_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_original public.cotizaciones%rowtype;
  v_nueva_id uuid;
  v_nueva_version integer;
begin
  if not public.es_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  select * into v_original
  from public.cotizaciones
  where id = _cotizacion_id
  for update;

  if not found then
    raise exception 'Cotización no encontrada';
  end if;

  if v_original.estado not in ('enviada','rechazada','vencida') then
    raise exception 'Solo se puede crear una nueva versión desde una cotización enviada, rechazada o vencida';
  end if;

  select coalesce(max(version), 0) + 1
    into v_nueva_version
  from public.cotizaciones
  where numero = v_original.numero;

  insert into public.cotizaciones (
    numero, version, cliente_id, proyecto_joya_id, sede_id, estado,
    fecha_emision, fecha_vencimiento, moneda,
    subtotal_costo, subtotal, descuento, impuestos, total, anticipo,
    notas_cliente, notas_internas, identidad_comercial,
    identidad_comercial_id, reemplaza_id, creado_por
  )
  select
    v_original.numero, v_nueva_version, cliente_id, proyecto_joya_id, sede_id, 'borrador',
    current_date, fecha_vencimiento, moneda,
    subtotal_costo, subtotal, descuento, impuestos, total, 0,
    notas_cliente, notas_internas, identidad_comercial,
    identidad_comercial_id, v_original.id, auth.uid()
  from public.cotizaciones
  where id = v_original.id
  returning id into v_nueva_id;

  insert into public.cotizacion_detalles (
    cotizacion_id, orden, tipo, descripcion, cantidad, unidad,
    costo_unitario, precio_unitario, metadata
  )
  select
    v_nueva_id, orden, tipo, descripcion, cantidad, unidad,
    costo_unitario, precio_unitario, metadata
  from public.cotizacion_detalles
  where cotizacion_id = v_original.id
  order by orden;

  return v_nueva_id;
end;
$$;

comment on function public.crear_version_cotizacion(uuid)
is 'Crea una nueva versión editable de una cotización enviada, rechazada o vencida y conserva intacta la versión anterior.';