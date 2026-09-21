-- Crea una cotización y su primera partida en una sola transacción.
-- Si falla cualquier paso, también se revierte el cliente creado automáticamente.

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
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  if not private.usuario_puede_ventas(v_uid, _sede_id) then
    raise exception 'Sin permisos para crear cotizaciones en este taller';
  end if;

  if _sede_id is null then
    raise exception 'El taller/sede es obligatorio';
  end if;

  if _moneda not in ('PEN','USD') then
    raise exception 'Moneda no válida';
  end if;

  if coalesce(_cantidad, 0) <= 0 then
    raise exception 'La cantidad debe ser mayor que cero';
  end if;

  if coalesce(_precio_unitario, 0) <= 0 then
    raise exception 'El precio al cliente debe ser mayor que cero';
  end if;

  if coalesce(_costo_unitario, 0) < 0
     or coalesce(_descuento, 0) < 0
     or coalesce(_impuestos, 0) < 0 then
    raise exception 'Los importes no pueden ser negativos';
  end if;

  if nullif(btrim(coalesce(_descripcion, '')), '') is null then
    raise exception 'La cotización debe tener un concepto';
  end if;

  if v_cliente_id is null then
    if nullif(btrim(coalesce(_cliente_nombre, '')), '') is null then
      raise exception 'El cliente es obligatorio';
    end if;

    insert into public.clientes (
      nombre, telefono, email, sede_id, estado, creado_por
    )
    values (
      btrim(_cliente_nombre),
      nullif(btrim(coalesce(_cliente_telefono, '')), ''),
      nullif(btrim(coalesce(_cliente_email, '')), ''),
      _sede_id,
      'activo',
      v_uid
    )
    returning id into v_cliente_id;
  else
    select sede_id
      into v_cliente_sede
    from public.clientes
    where id = v_cliente_id
    for share;

    if not found then
      raise exception 'Cliente no encontrado';
    end if;

    if not public.es_admin(v_uid)
       and v_cliente_sede is distinct from _sede_id then
      raise exception 'El cliente no pertenece al taller activo';
    end if;
  end if;

  if _proyecto_joya_id is not null then
    select sede_id
      into v_proyecto_sede
    from public.proyectos_joya
    where id = _proyecto_joya_id
    for share;

    if not found then
      raise exception 'Proyecto de joya no encontrado';
    end if;

    if not public.es_admin(v_uid)
       and v_proyecto_sede is distinct from _sede_id then
      raise exception 'El proyecto no pertenece al taller activo';
    end if;
  end if;

  insert into public.cotizaciones (
    cliente_id,
    proyecto_joya_id,
    sede_id,
    estado,
    moneda,
    subtotal_costo,
    subtotal,
    descuento,
    impuestos,
    total,
    notas_cliente,
    notas_internas,
    creado_por,
    fecha_vencimiento,
    fecha_entrega_solicitada
  )
  values (
    v_cliente_id,
    _proyecto_joya_id,
    _sede_id,
    'borrador',
    _moneda,
    round(coalesce(_costo_unitario, 0) * _cantidad, 2),
    round(coalesce(_precio_unitario, 0) * _cantidad, 2),
    round(coalesce(_descuento, 0), 2),
    round(coalesce(_impuestos, 0), 2),
    greatest(
      0,
      round(
        coalesce(_precio_unitario, 0) * _cantidad
        - coalesce(_descuento, 0)
        + coalesce(_impuestos, 0),
        2
      )
    ),
    coalesce(_notas_cliente, ''),
    coalesce(_notas_internas, ''),
    v_uid,
    _fecha_vencimiento,
    _fecha_entrega_solicitada
  )
  returning id into v_cotizacion_id;

  insert into public.cotizacion_detalles (
    cotizacion_id,
    orden,
    tipo,
    descripcion,
    cantidad,
    unidad,
    costo_unitario,
    precio_unitario
  )
  values (
    v_cotizacion_id,
    1,
    'otro',
    btrim(_descripcion),
    _cantidad,
    'und',
    coalesce(_costo_unitario, 0),
    coalesce(_precio_unitario, 0)
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
