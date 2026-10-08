-- La modalidad de trabajo gobierna la derivación de Producción.
-- Si Producción está apagada no se puede preparar una OP.
-- Si Servicios externos está apagado, una ruta que requiera una capacidad
-- inexistente en la sede se bloquea en lugar de crear trabajo externo.

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
  v_externos integer := 0;
  v_cantidad integer;
  v_peso numeric;
  v_numero text;
  v_ya_existia boolean := false;
  v_peso_text text;
  v_tipo text;
  v_produccion_activa boolean;
  v_servicios_externos_activos boolean;
  i integer;
begin
  if v_uid is null then raise exception 'Sesión no válida'; end if;

  select * into v_pedido
  from public.pedidos
  where id = _pedido_id
  for update;

  if v_pedido.id is null then raise exception 'Pedido no encontrado'; end if;
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

  select
    coalesce(sm.produccion_activa, false),
    coalesce(sm.servicios_externos_activos, false)
  into v_produccion_activa, v_servicios_externos_activos
  from public.sede_modalidades sm
  where sm.sede_id = v_pedido.sede_id;

  if not v_produccion_activa then
    raise exception 'La modalidad Producción está desactivada para este taller. Actívala en Gestión → Capacidades del taller.';
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

      select case when exists (
        select 1
        from public.sede_especialidades se
        join public.especialidades e on e.id = se.especialidad_id
        where se.sede_id = v_pedido.sede_id
          and e.categoria = 'Producción'
          and lower(trim(e.nombre)) = lower(trim(v_area))
      ) then 'interno' else 'externo' end
      into v_tipo;

      if v_tipo = 'externo' and not v_servicios_externos_activos then
        raise exception
          'La ruta requiere "%", pero esta sede no tiene esa capacidad interna y Servicios externos está desactivado. Activa la modalidad o configura la capacidad del taller.',
          v_area;
      end if;

      insert into public.trabajos (
        pedido_id, orden_produccion_id, sede_id, secuencia, area, ubicacion,
        titulo, descripcion, estado, prioridad, tipo, fecha_planificada, notas
      )
      values (
        v_pedido.id, v_op.id, v_pedido.sede_id, v_secuencia, v_area,
        case when v_tipo = 'interno' then v_area else 'Servicio externo' end,
        v_area || ' · ' || coalesce(nullif(v_pedido.trabajo, ''), nullif(v_pedido.pieza, ''), 'Trabajo'),
        case
          when v_tipo = 'interno'
            then 'Operación asignada automáticamente al área interna por capacidad de la sede.'
          else 'La sede no tiene esta capacidad. Requiere seleccionar un servicio o profesional externo.'
        end,
        'pendiente', 'normal', v_tipo, v_pedido.fecha_entrega, ''
      );

      if v_tipo = 'externo' then v_externos := v_externos + 1; end if;
    end loop;

    v_trabajos := v_secuencia;
  else
    select count(*) into v_externos
    from public.trabajos
    where orden_produccion_id = v_op.id
      and tipo = 'externo'
      and participante_id is null;
  end if;

  if v_trabajos = 0 then raise exception 'No se pudo generar ninguna operación de fabricación'; end if;

  v_cantidad := greatest(coalesce(v_pedido.cantidad_piezas, 1), 1);
  v_peso_text := nullif(trim(v_pedido.peso_estimado::text), '');
  if v_peso_text is not null then
    v_peso_text := replace(v_peso_text, ',', '.');
    if v_peso_text ~ '^\d+(\.\d+)?$' then v_peso := v_peso_text::numeric; end if;
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
    'externos_pendientes', v_externos,
    'cantidad_requerida', v_cantidad,
    'estado', v_op.estado,
    'ya_existia', v_ya_existia
  );
end;
$$;

revoke all on function public.preparar_produccion_pedido(uuid) from public, anon;
grant execute on function public.preparar_produccion_pedido(uuid) to authenticated;

notify pgrst, 'reload schema';
