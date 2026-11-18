-- Producción: derivación automática interna/externa según capacidad real de la sede.
-- No permite elegir arbitrariamente la ejecución: la sede determina el tipo.
-- Si la sede no tiene la capacidad del área, el trabajo nace como externo y
-- debe recibir un participante externo antes de liberar la OP.

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

      -- La capacidad principal de producción pertenece a la sede.
      -- Si existe en sede_especialidades, la operación es interna.
      -- Si no existe, queda obligatoriamente como servicio externo.
      select case when exists (
        select 1
        from public.sede_especialidades se
        join public.especialidades e on e.id = se.especialidad_id
        where se.sede_id = v_pedido.sede_id
          and e.categoria = 'Producción'
          and lower(trim(e.nombre)) = lower(trim(v_area))
      ) then 'interno' else 'externo' end
      into v_tipo;

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

      if v_tipo = 'externo' then
        v_externos := v_externos + 1;
      end if;
    end loop;

    v_trabajos := v_secuencia;
  else
    select count(*) into v_externos
    from public.trabajos
    where orden_produccion_id = v_op.id
      and tipo = 'externo'
      and participante_id is null;
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
    'externos_pendientes', v_externos,
    'cantidad_requerida', v_cantidad,
    'estado', v_op.estado,
    'ya_existia', v_ya_existia
  );
end;
$$;

revoke all on function public.preparar_produccion_pedido(uuid) from public, anon;
grant execute on function public.preparar_produccion_pedido(uuid) to authenticated;

-- Una OP no puede liberarse si existe una operación externa sin proveedor.
-- Tampoco puede entrar en producción sin trabajos.
create or replace function public.transicionar_orden_produccion(_orden_id uuid,_nuevo_estado text)
returns public.ordenes_produccion
language plpgsql security invoker set search_path=''
as $$
declare
  v_op public.ordenes_produccion;
  v_pedido public.pedidos;
  v_total int;
  v_done int;
  v_externos_pendientes int;
  v_qc boolean;
  v_piece boolean;
begin
  select * into v_op
  from public.ordenes_produccion
  where id=_orden_id
  for update;

  if v_op.id is null then raise exception 'Orden de producción no encontrada'; end if;
  if not public.ve_sede((select auth.uid()),v_op.sede_id) then raise exception 'No tienes acceso a esta orden'; end if;

  select * into v_pedido from public.pedidos where id=v_op.pedido_id;
  if v_pedido.id is null or v_pedido.sede_id<>v_op.sede_id then
    raise exception 'Pedido y orden no pertenecen a la misma sede';
  end if;

  if _nuevo_estado not in ('borrador','liberada','en_produccion','pausada','control_calidad','terminada','cancelada') then
    raise exception 'Estado de OP no válido';
  end if;

  if _nuevo_estado=v_op.estado then return v_op; end if;

  select count(*) into v_total
  from public.trabajos
  where orden_produccion_id=_orden_id;

  select count(*) into v_externos_pendientes
  from public.trabajos
  where orden_produccion_id=_orden_id
    and tipo='externo'
    and participante_id is null;

  if _nuevo_estado='liberada' and v_op.estado<>'borrador' then
    raise exception 'Solo una OP en borrador puede liberarse';
  end if;

  if _nuevo_estado='liberada' then
    if v_total=0 then
      raise exception 'No se puede liberar la OP: no tiene operaciones de producción';
    end if;
    if v_externos_pendientes>0 then
      raise exception 'No se puede liberar la OP: hay % operación(es) externa(s) sin servicio o profesional asignado', v_externos_pendientes;
    end if;
  end if;

  if _nuevo_estado='en_produccion' and v_op.estado not in ('liberada','pausada') then
    raise exception 'La OP debe estar liberada o pausada para entrar en producción';
  end if;

  if _nuevo_estado='en_produccion' then
    if v_total=0 then
      raise exception 'No se puede iniciar producción: la OP no tiene operaciones';
    end if;
    if v_externos_pendientes>0 then
      raise exception 'No se puede iniciar producción: hay operaciones externas sin servicio o profesional asignado';
    end if;
  end if;

  if _nuevo_estado='pausada' and v_op.estado<>'en_produccion' then
    raise exception 'Solo una OP en producción puede pausarse';
  end if;

  if _nuevo_estado='control_calidad' and v_op.estado<>'en_produccion' then
    raise exception 'La OP debe estar en producción para pasar a calidad';
  end if;

  if _nuevo_estado='control_calidad' then
    select count(*),count(*) filter(where estado='completado')
    into v_total,v_done
    from public.trabajos
    where orden_produccion_id=_orden_id;

    if v_total=0 or v_done<v_total then
      raise exception 'No se puede pasar a calidad: todos los trabajos deben estar completados';
    end if;
  end if;

  if _nuevo_estado='terminada' then
    select exists(
      select 1 from public.control_calidad
      where orden_produccion_id=_orden_id
        and tipo='inspeccion_final'
        and resultado='aprobado'
    ) into v_qc;

    select exists(
      select 1 from public.piezas_terminadas
      where orden_produccion_id=_orden_id
        and estado in ('liberada','verificada')
    ) into v_piece;

    if not v_qc then raise exception 'La OP necesita una inspección final aprobada'; end if;
    if not v_piece then raise exception 'La OP necesita una pieza verificada o liberada'; end if;
  end if;

  if _nuevo_estado='cancelada' and v_op.estado='terminada' then
    raise exception 'Una OP terminada no puede cancelarse';
  end if;

  update public.ordenes_produccion
  set estado=_nuevo_estado,
      fecha_inicio=case when _nuevo_estado='en_produccion' then coalesce(fecha_inicio,now()) else fecha_inicio end,
      fecha_fin=case when _nuevo_estado='terminada' then coalesce(fecha_fin,now()) else fecha_fin end,
      updated_at=now()
  where id=_orden_id
  returning * into v_op;

  if _nuevo_estado='en_produccion' then
    update public.pedidos
    set estado='En Producción',updated_at=now()
    where id=v_op.pedido_id and estado not in ('Entregado','Cancelado');
  elsif _nuevo_estado='terminada' then
    update public.pedidos
    set estado='Listo para Entrega',
        area_actual='Área ventas',
        fecha_listo_entrega=coalesce(fecha_listo_entrega,now()),
        updated_at=now()
    where id=v_op.pedido_id and estado not in ('Entregado','Cancelado');
  elsif _nuevo_estado='cancelada' then
    update public.pedidos
    set estado='Cancelado',updated_at=now()
    where id=v_op.pedido_id and estado<>'Entregado';
  end if;

  return v_op;
end $$;

revoke all on function public.transicionar_orden_produccion(uuid,text) from public,anon;
grant execute on function public.transicionar_orden_produccion(uuid,text) to authenticated;

notify pgrst, 'reload schema';
