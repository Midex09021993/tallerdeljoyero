-- Hotfix de producción: la OP debe usar un estado permitido por ordenes_produccion_estado_check.
-- La función histórica usaba 'planificada', pero el dominio vigente usa:
-- borrador | liberada | en_produccion | pausada | control_calidad | terminada | cancelada.
-- Se vuelve a declarar la función completa para garantizar que Lovable Cloud reemplace
-- cualquier versión anterior que siga insertando 'planificada'.

-- Corrección de producción: ejecución segura y compatible con peso_estimado almacenado como texto.
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
  if v_uid is null then
    raise exception 'Sesión no válida';
  end if;

  select * into v_pedido
  from public.pedidos
  where id = _pedido_id
  for update;

  if v_pedido.id is null then
    raise exception 'Pedido no encontrado';
  end if;

  if not public.ve_sede(v_uid, v_pedido.sede_id) then
    raise exception 'No tienes acceso al taller de este pedido';
  end if;

  if not (
    public.es_admin(v_uid)
    or public.has_role(v_uid, 'operario')
    or public.has_role(v_uid, 'monitor')
  ) then
    raise exception 'No tienes permisos para preparar producción';
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

    select * into v_op
    from public.ordenes_produccion
    where pedido_id = _pedido_id
    limit 1
    for update;

    if v_op.id is null then
      perform pg_advisory_xact_lock(hashtext('numero-op:' || to_char(current_date, 'YYYY')));

      select 'OP-' || to_char(current_date, 'YYYY') || '-' ||
             lpad((
               coalesce(max(
                 case
                   when numero ~ ('^OP-' || to_char(current_date, 'YYYY') || '-[0-9]+$')
                   then substring(numero from 9)::bigint
                   else 0
                 end
               ), 0) + 1
             )::text, 5, '0')
      into v_numero
      from public.ordenes_produccion;

      insert into public.ordenes_produccion (
        pedido_id, sede_id, numero, estado, prioridad, creado_por, notas
      )
      values (
        v_pedido.id, v_pedido.sede_id, v_numero, 'borrador', 'normal',
        v_uid, coalesce(v_pedido.notas, '')
      )
      returning * into v_op;
    end if;
  end if;

  v_ruta := coalesce(v_pedido.ruta, array[]::text[]);
  v_ruta := array(
    select trim(x)
    from unnest(v_ruta) x
    where trim(x) <> ''
      and lower(trim(x)) not in (
        'pedidos','área ventas','area ventas','ventas','terminado','entregado'
      )
  );

  if coalesce(array_length(v_ruta, 1), 0) = 0 then
    v_ruta := array['Taller']::text[];
  end if;

  update public.trabajos
  set orden_produccion_id = v_op.id
  where pedido_id = _pedido_id
    and orden_produccion_id is null;

  select count(*) into v_trabajos
  from public.trabajos
  where orden_produccion_id = v_op.id;

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

  if v_trabajos = 0 then
    raise exception 'No se pudo generar ninguna operación de fabricación';
  end if;

  v_cantidad := greatest(coalesce(v_pedido.cantidad_piezas, 1), 1);

  v_peso_text := nullif(trim(v_pedido.peso_estimado::text), '');
  if v_peso_text is not null then
    v_peso_text := replace(v_peso_text, ',', '.');
    if v_peso_text ~ '^\d+(\.\d+)?$' then
      v_peso := v_peso_text::numeric;
    end if;
  end if;

  select count(*) into v_piezas
  from public.piezas_terminadas
  where orden_produccion_id = v_op.id;

  if v_piezas = 0 then
    for i in 1..v_cantidad loop
      insert into public.piezas_terminadas (
        orden_produccion_id, pedido_id, numero_pieza, cantidad,
        peso_estimado, metal_estimado, piedras_estimadas, estado,
        registrado_por, observaciones
      )
      values (
        v_op.id, v_pedido.id,
        v_op.numero || '-' || lpad(i::text, 2, '0'),
        1,
        case when v_cantidad = 1 then v_peso else null end,
        coalesce(v_pedido.material, ''),
        coalesce(v_pedido.piedras, ''),
        'pendiente',
        v_uid,
        'Pieza generada al preparar la producción.'
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
grant execute on function public.preparar_produccion_pedido(uuid) to authenticated;
