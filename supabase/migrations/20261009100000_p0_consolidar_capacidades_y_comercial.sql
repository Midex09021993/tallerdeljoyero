-- P0 CANONICO: consolidacion de capacidades y flujo comercial.
-- Regla: esta migracion es la ultima definicion ejecutable de estas RPC.
-- No modifica datos historicos; solo fija contratos de funcion y autorizacion.

-- ============================================================
-- 1. CAPACIDADES DEL TALLER
-- Fuente de autorizacion: user_roles + participante_cuentas +
-- ecosistema_participantes. profiles.sede_id no autoriza.
-- ============================================================

create or replace function public.guardar_configuracion_taller(
  _sede_id uuid,
  _especialidad_ids uuid[] default '{}'::uuid[],
  _produccion_activa boolean default false,
  _servicios_externos_activos boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_es_dueno boolean := false;
  v_es_gerente boolean := false;
  v_pertenece_sede boolean := false;
  v_total integer := 0;
begin
  if v_uid is null then
    raise exception using errcode = '28000', message = 'Sesión no autenticada';
  end if;

  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = v_uid
      and ur.role = 'dueno'::public.app_role
  ) into v_es_dueno;

  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = v_uid
      and ur.role = 'gerente'::public.app_role
  ) into v_es_gerente;

  if not exists (
    select 1 from public.sedes s where s.id = _sede_id
  ) then
    raise exception using errcode = '22023', message = 'La sede seleccionada no existe';
  end if;

  if not v_es_dueno and v_es_gerente then
    select exists (
      select 1
      from public.participante_cuentas pc
      join public.ecosistema_participantes ep on ep.id = pc.participante_id
      where pc.user_id = v_uid
        and pc.estado = 'activo'
        and ep.estado = 'activo'
        and ep.sede_id = _sede_id
    ) into v_pertenece_sede;
  end if;

  if not v_es_dueno and not (v_es_gerente and v_pertenece_sede) then
    raise exception using errcode = '42501', message = 'No tienes permisos para configurar este taller';
  end if;

  delete from public.sede_especialidades
  where sede_id = _sede_id;

  insert into public.sede_especialidades (sede_id, especialidad_id)
  select _sede_id, x.especialidad_id
  from (
    select distinct unnest(coalesce(_especialidad_ids, '{}'::uuid[])) as especialidad_id
  ) x
  join public.especialidades e
    on e.id = x.especialidad_id
   and e.activa = true;

  get diagnostics v_total = row_count;

  insert into public.sede_modalidades (
    sede_id,
    produccion_activa,
    servicios_externos_activos
  )
  values (
    _sede_id,
    coalesce(_produccion_activa, false),
    coalesce(_servicios_externos_activos, false)
  )
  on conflict (sede_id) do update set
    produccion_activa = excluded.produccion_activa,
    servicios_externos_activos = excluded.servicios_externos_activos,
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'sede_id', _sede_id,
    'capacidades_guardadas', v_total,
    'produccion_activa', coalesce(_produccion_activa, false),
    'servicios_externos_activos', coalesce(_servicios_externos_activos, false)
  );
end;
$$;

revoke all on function public.guardar_configuracion_taller(uuid, uuid[], boolean, boolean)
from public, anon;

grant execute on function public.guardar_configuracion_taller(uuid, uuid[], boolean, boolean)
to authenticated;

-- ============================================================
-- 2. COTIZACION -> PEDIDO
-- Contrato opcional. Retorno canonico: jsonb con pedido_id.
-- Idempotente por cotizacion.
-- ============================================================

drop function if exists public.convertir_cotizacion_a_pedido(uuid);

create function public.convertir_cotizacion_a_pedido(_cotizacion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cot public.cotizaciones%rowtype;
  v_cliente public.clientes%rowtype;
  v_proyecto public.proyectos_joya%rowtype;
  v_pedido_id uuid;
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

    return jsonb_build_object(
      'pedido_id', v_existente,
      'contrato_id', null,
      'contrato_numero', null,
      'creado', false
    );
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
    'PED-' || to_char(current_date, 'YYYY') || '-' || lpad(v_next::text, 5, '0'),
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
    array['Pedidos']::text[],
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

  return jsonb_build_object(
    'pedido_id', v_pedido_id,
    'contrato_id', null,
    'contrato_numero', null,
    'creado', true
  );
end;
$$;

comment on function public.convertir_cotizacion_a_pedido(uuid)
is 'Conversión canónica de cotización aprobada a pedido sin contrato. Idempotente y con snapshot comercial en pedido_comercial.';

revoke all on function public.convertir_cotizacion_a_pedido(uuid) from public, anon;
grant execute on function public.convertir_cotizacion_a_pedido(uuid) to authenticated;

-- ============================================================
-- 3. COTIZACION -> PEDIDO + CONTRATO OPCIONAL
-- Retorno jsonb. No usa contratos.saldo: el esquema canónico
-- de contratos no contiene esa columna; el saldo comercial vive
-- en pedido_comercial.
-- ============================================================

create or replace function public.convertir_cotizacion_a_pedido_contrato(_cotizacion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cot public.cotizaciones%rowtype;
  v_cliente public.clientes%rowtype;
  v_contrato_id uuid;
  v_contrato_numero text;
  v_pedido_id uuid;
  v_existente_contrato uuid;
  v_resultado jsonb;
  v_next bigint;
  v_anio text;
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

  select id
  into v_existente_contrato
  from public.contratos
  where cotizacion_id = _cotizacion_id
  limit 1;

  if v_existente_contrato is not null then
    v_resultado := public.convertir_cotizacion_a_pedido(_cotizacion_id);
    v_pedido_id := nullif(v_resultado->>'pedido_id', '')::uuid;

    update public.pedidos
    set contrato_id = v_existente_contrato,
        contrato = (select numero from public.contratos where id = v_existente_contrato),
        updated_at = now()
    where id = v_pedido_id;

    return jsonb_build_object(
      'pedido_id', v_pedido_id,
      'contrato_id', v_existente_contrato,
      'contrato_numero', (select numero from public.contratos where id = v_existente_contrato),
      'creado', false
    );
  end if;

  perform pg_advisory_xact_lock(hashtext('contrato:global'));

  v_anio := to_char(current_date, 'YYYY');

  select coalesce(
    max(
      case
        when numero ~ ('^CTR-' || v_anio || '-[0-9]+$')
        then substring(numero from 10)::bigint
        else 0
      end
    ),
    0
  ) + 1
  into v_next
  from public.contratos;

  while exists (
    select 1 from public.contratos
    where numero = 'CTR-' || v_anio || '-' || lpad(v_next::text, 5, '0')
  ) loop
    v_next := v_next + 1;
  end loop;

  v_contrato_numero := 'CTR-' || v_anio || '-' || lpad(v_next::text, 5, '0');

  insert into public.contratos (
    numero,
    cliente,
    telefono,
    origen,
    total,
    abonado,
    sede_id,
    notas,
    cotizacion_id
  )
  values (
    v_contrato_numero,
    v_cliente.nombre,
    coalesce(v_cliente.telefono, ''),
    'Cotización ' || v_cot.numero || ' v' || v_cot.version,
    greatest(0, coalesce(v_cot.total, 0)),
    0,
    v_cot.sede_id,
    coalesce(v_cot.notas_internas, ''),
    _cotizacion_id
  )
  returning id into v_contrato_id;

  v_resultado := public.convertir_cotizacion_a_pedido(_cotizacion_id);
  v_pedido_id := nullif(v_resultado->>'pedido_id', '')::uuid;

  update public.pedidos
  set contrato_id = v_contrato_id,
      contrato = v_contrato_numero,
      updated_at = now()
  where id = v_pedido_id;

  return jsonb_build_object(
    'pedido_id', v_pedido_id,
    'contrato_id', v_contrato_id,
    'contrato_numero', v_contrato_numero,
    'creado', true
  );
end;
$$;

comment on function public.convertir_cotizacion_a_pedido_contrato(uuid)
is 'Conversión canónica de cotización aprobada a pedido y contrato opcional. Idempotente y compatible con el esquema actual de contratos.';

revoke all on function public.convertir_cotizacion_a_pedido_contrato(uuid) from public, anon;
grant execute on function public.convertir_cotizacion_a_pedido_contrato(uuid) to authenticated;

notify pgrst, 'reload schema';
