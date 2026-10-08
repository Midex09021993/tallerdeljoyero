-- Configuración documental v2 para cotizaciones.
-- No crea datos históricos nuevos: amplía la identidad comercial y conserva
-- configuración documental adicional en metadata para poder congelarla en cada cotización.

alter table public.identidades_comerciales
  add column if not exists rnp_bienes text,
  add column if not exists rpp_servicios text;

update public.identidades_comerciales
set metadata = coalesce(metadata, '{}'::jsonb)
  || jsonb_build_object(
    'cotizacion', coalesce(metadata->'cotizacion', '{}'::jsonb)
  )
where metadata is null
   or not (metadata ? 'cotizacion');

comment on column public.identidades_comerciales.metadata is
  'Configuración documental adicional. Incluye cotizacion.introduccion, cotizacion.terminos, cotizacion.firma, cotizacion.cuentas_bancarias y preferencias de presentación.';

-- Actualiza la captura histórica de identidad para que una cotización conserve
-- también la configuración documental vigente al momento de creación.
create or replace function public.crear_cotizacion_comercial(
  _cliente_id uuid,
  _cliente_nombre text,
  _cliente_telefono text,
  _cliente_email text,
  _proyecto_joya_id uuid,
  _sede_id uuid,
  _moneda text,
  _cantidad numeric,
  _costo_unitario numeric,
  _precio_unitario numeric,
  _descuento numeric,
  _impuestos numeric,
  _fecha_vencimiento date,
  _fecha_entrega_solicitada date,
  _notas_cliente text,
  _notas_internas text,
  _descripcion text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_cliente_id uuid := _cliente_id;
  v_cotizacion_id uuid;
  v_cliente_sede uuid;
  v_proyecto_sede uuid;
  v_identidad_id uuid;
  v_identidad jsonb := '{}'::jsonb;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if not private.usuario_puede_ventas(v_uid, _sede_id) then raise exception 'Sin permisos para crear cotizaciones en este taller'; end if;
  if _sede_id is null then raise exception 'El taller/sede es obligatorio'; end if;
  if _moneda is null or length(btrim(_moneda)) <> 3 then raise exception 'Moneda no válida'; end if;
  if coalesce(_cantidad, 0) <= 0 then raise exception 'La cantidad debe ser mayor que cero'; end if;
  if coalesce(_precio_unitario, 0) <= 0 then raise exception 'El precio al cliente debe ser mayor que cero'; end if;
  if coalesce(_costo_unitario, 0) < 0 or coalesce(_descuento, 0) < 0 or coalesce(_impuestos, 0) < 0 then raise exception 'Los importes no pueden ser negativos'; end if;
  if nullif(btrim(coalesce(_descripcion, '')), '') is null then raise exception 'La cotización debe tener un concepto'; end if;

  select id into v_identidad_id
  from public.identidades_comerciales
  where sede_id = _sede_id and activa = true
  order by updated_at desc, created_at desc
  limit 1;

  if v_identidad_id is not null then
    select jsonb_build_object(
      'id', id,
      'sede_id', sede_id,
      'nombre_comercial', nombre_comercial,
      'razon_social', razon_social,
      'ruc', ruc,
      'rnp_bienes', rnp_bienes,
      'rpp_servicios', rpp_servicios,
      'logo_url', logo_url,
      'email', email,
      'telefono', telefono,
      'whatsapp', whatsapp,
      'direccion', direccion,
      'ciudad', ciudad,
      'sitio_web', sitio_web,
      'color_principal', color_principal,
      'pie_documento', pie_documento,
      'pais_codigo', pais_codigo,
      'pais_nombre', pais_nombre,
      'moneda_codigo', moneda_codigo,
      'moneda_simbolo', moneda_simbolo,
      'impuesto_activo', impuesto_activo,
      'impuesto_nombre', impuesto_nombre,
      'impuesto_tasa', impuesto_tasa,
      'impuesto_incluido', impuesto_incluido,
      'identificador_fiscal_label', identificador_fiscal_label,
      'zona_horaria', zona_horaria,
      'metadata', coalesce(metadata, '{}'::jsonb)
    )
    into v_identidad
    from public.identidades_comerciales
    where id = v_identidad_id;
  end if;

  if v_cliente_id is null then
    if nullif(btrim(coalesce(_cliente_nombre, '')), '') is null then raise exception 'El cliente es obligatorio'; end if;
    insert into public.clientes (nombre, telefono, email, sede_id, estado, creado_por)
    values (btrim(_cliente_nombre), nullif(btrim(coalesce(_cliente_telefono, '')), ''), nullif(btrim(coalesce(_cliente_email, '')), ''), _sede_id, 'activo', v_uid)
    returning id into v_cliente_id;
  else
    select sede_id into v_cliente_sede from public.clientes where id = v_cliente_id for share;
    if not found then raise exception 'Cliente no encontrado'; end if;
    if not public.es_admin(v_uid) and v_cliente_sede is distinct from _sede_id then raise exception 'El cliente no pertenece al taller activo'; end if;
  end if;

  if _proyecto_joya_id is not null then
    select sede_id into v_proyecto_sede from public.proyectos_joya where id = _proyecto_joya_id for share;
    if not found then raise exception 'Proyecto de joya no encontrado'; end if;
    if not public.es_admin(v_uid) and v_proyecto_sede is distinct from _sede_id then raise exception 'El proyecto no pertenece al taller activo'; end if;
  end if;

  insert into public.cotizaciones (
    cliente_id, proyecto_joya_id, sede_id, estado, moneda, subtotal_costo, subtotal,
    descuento, impuestos, total, notas_cliente, notas_internas, identidad_comercial,
    identidad_comercial_id, creado_por, fecha_vencimiento, fecha_entrega_solicitada
  )
  values (
    v_cliente_id, _proyecto_joya_id, _sede_id, 'borrador', upper(btrim(_moneda)),
    round(coalesce(_costo_unitario, 0) * _cantidad, 2),
    round(coalesce(_precio_unitario, 0) * _cantidad, 2),
    round(coalesce(_descuento, 0), 2),
    round(coalesce(_impuestos, 0), 2),
    greatest(0, round(coalesce(_precio_unitario, 0) * _cantidad - coalesce(_descuento, 0) + coalesce(_impuestos, 0), 2)),
    coalesce(_notas_cliente, ''), coalesce(_notas_internas, ''), v_identidad, v_identidad_id,
    v_uid, _fecha_vencimiento, _fecha_entrega_solicitada
  )
  returning id into v_cotizacion_id;

  insert into public.cotizacion_detalles (
    cotizacion_id, orden, tipo, descripcion, cantidad, unidad, costo_unitario, precio_unitario
  )
  values (
    v_cotizacion_id, 1, 'otro', btrim(_descripcion), _cantidad, 'und',
    coalesce(_costo_unitario, 0), coalesce(_precio_unitario, 0)
  );

  return v_cotizacion_id;
end;
$$;

revoke all on function public.crear_cotizacion_comercial(
  uuid,text,text,text,uuid,uuid,text,numeric,numeric,numeric,numeric,numeric,date,date,text,text,text
) from public, anon;

grant execute on function public.crear_cotizacion_comercial(
  uuid,text,text,text,uuid,uuid,text,numeric,numeric,numeric,numeric,numeric,date,date,text,text,text
) to authenticated;
