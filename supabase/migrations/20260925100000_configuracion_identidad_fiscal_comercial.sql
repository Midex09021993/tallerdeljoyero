-- Configuración fiscal, monetaria y documental por identidad comercial.
-- La identidad comercial sigue siendo la única fuente de verdad del taller/joyería.

alter table public.identidades_comerciales
  add column if not exists pais_codigo text not null default 'PE',
  add column if not exists pais_nombre text not null default 'Perú',
  add column if not exists moneda_codigo text not null default 'PEN',
  add column if not exists moneda_simbolo text not null default 'S/',
  add column if not exists impuesto_activo boolean not null default true,
  add column if not exists impuesto_nombre text not null default 'IGV',
  add column if not exists impuesto_tasa numeric(6,3) not null default 18,
  add column if not exists impuesto_incluido boolean not null default false,
  add column if not exists identificador_fiscal_label text not null default 'RUC',
  add column if not exists zona_horaria text not null default 'America/Lima';

alter table public.identidades_comerciales
  drop constraint if exists identidades_comerciales_impuesto_tasa_check;

alter table public.cotizaciones
  drop constraint if exists cotizaciones_moneda_check;

alter table public.identidades_comerciales
  add constraint identidades_comerciales_impuesto_tasa_check
  check (impuesto_tasa >= 0 and impuesto_tasa <= 100);

-- Defaults coherentes con la normativa general vigente de Perú y Colombia.
update public.identidades_comerciales
set pais_codigo = 'PE',
    pais_nombre = 'Perú',
    moneda_codigo = 'PEN',
    moneda_simbolo = 'S/',
    impuesto_activo = true,
    impuesto_nombre = 'IGV',
    impuesto_tasa = 18,
    identificador_fiscal_label = 'RUC',
    zona_horaria = 'America/Lima'
where pais_codigo is null or btrim(pais_codigo) = '';

-- La cotización conserva un snapshot de la identidad; no debe cambiar si después
-- el taller modifica sus datos de configuración.
comment on column public.identidades_comerciales.metadata is
  'Configuración adicional no estructural del taller. Los datos fiscales y monetarios principales viven en columnas tipadas.';

-- A partir de ahora la RPC existente toma automáticamente la identidad activa de la sede
-- y congela sus datos en la cotización. Se mantiene la firma actual para no romper clientes.
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
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  if not private.usuario_puede_ventas(v_uid, _sede_id) then
    raise exception 'Sin permisos para crear cotizaciones en este taller';
  end if;

  if _sede_id is null then
    raise exception 'El taller/sede es obligatorio';
  end if;

  if _moneda is null or length(btrim(_moneda)) <> 3 then
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

  select id
    into v_identidad_id
  from public.identidades_comerciales
  where sede_id = _sede_id
    and activa = true
  order by updated_at desc, created_at desc
  limit 1;

  if v_identidad_id is not null then
    select jsonb_build_object(
      'id', id,
      'sede_id', sede_id,
      'nombre_comercial', nombre_comercial,
      'razon_social', razon_social,
      'ruc', ruc,
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
      'zona_horaria', zona_horaria
    )
    into v_identidad
    from public.identidades_comerciales
    where id = v_identidad_id;
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
    identidad_comercial,
    identidad_comercial_id,
    creado_por,
    fecha_vencimiento,
    fecha_entrega_solicitada
  )
  values (
    v_cliente_id,
    _proyecto_joya_id,
    _sede_id,
    'borrador',
    upper(btrim(_moneda)),
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
    v_identidad,
    v_identidad_id,
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
