-- Conversión determinista de operaciones a servicio externo.
-- Regla:
-- 1) Si el taller origen tiene la capacidad, el trabajo permanece interno.
-- 2) Si no la tiene y existe exactamente un participante activo con esa especialidad,
--    el trabajo se asigna automáticamente como externo a ese participante.
-- 3) Si hay cero o múltiples candidatos, no se inventa un proveedor: el trabajo queda
--    pendiente de asignación administrativa.
--
-- sede_id conserva siempre el taller de origen.
-- participante_id identifica al taller/profesional ejecutor cuando es externo.

begin;

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
  v_participante_externo uuid;
  v_candidatos integer;
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

      -- La operación nace interna solo como estado inicial.
      -- La capacidad del origen se evalúa inmediatamente después.
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

  -- Reconciliación de capacidad:
  -- solo trabajos pendientes sin responsable se convierten automáticamente.
  -- El origen conserva la operación si tiene la especialidad.
  for v_area in
    select distinct trim(t.area)
    from public.trabajos t
    where t.orden_produccion_id = v_op.id
      and t.estado = 'pendiente'
      and t.responsable_user_id is null
      and t.tipo = 'interno'
      and nullif(trim(t.area), '') is not null
  loop
    if not exists (
      select 1
      from public.ecosistema_participantes ep_origen
      join public.participante_especialidades pe_origen
        on pe_origen.participante_id = ep_origen.id
      join public.especialidades e on e.id = pe_origen.especialidad_id
      where ep_origen.sede_id = v_pedido.sede_id
        and ep_origen.estado = 'activo'
        and e.activa = true
        and lower(trim(e.nombre)) = lower(trim(v_area))
    ) then
      v_participante_externo := null;
      v_candidatos := 0;

      select count(*), min(ep.id)
      into v_candidatos, v_participante_externo
      from public.ecosistema_participantes ep
      join public.participante_especialidades pe
        on pe.participante_id = ep.id
      join public.especialidades e
        on e.id = pe.especialidad_id
      where ep.estado = 'activo'
        and ep.sede_id is not null
        and ep.sede_id <> v_pedido.sede_id
        and e.activa = true
        and lower(trim(e.nombre)) = lower(trim(v_area));

      if v_candidatos = 1 then
        update public.trabajos
        set tipo = 'externo',
            participante_id = v_participante_externo,
            responsable_user_id = null,
            updated_at = now()
        where orden_produccion_id = v_op.id
          and estado = 'pendiente'
          and responsable_user_id is null
          and tipo = 'interno'
          and lower(trim(area)) = lower(trim(v_area));
      end if;
    end if;
  end loop;

  select count(*) into v_piezas
  from public.piezas_terminadas
  where orden_produccion_id = v_op.id;

  v_cantidad := greatest(coalesce(v_pedido.cantidad_piezas, 1), 1);

  v_peso_text := nullif(trim(v_pedido.peso_estimado::text), '');
  if v_peso_text is not null then
    v_peso_text := replace(v_peso_text, ',', '.');
    if v_peso_text ~ '^\d+(\.\d+)?$' then
      v_peso := v_peso_text::numeric;
    end if;
  end if;

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

-- Reconciliación única de trabajos ya existentes:
-- convierte únicamente operaciones pendientes sin responsable, cuyo origen no
-- tiene la capacidad y para las que existe exactamente un participante externo
-- activo con la especialidad. No toca trabajos en proceso/completados ni duplica datos.
do $reconcile$
declare
  r record;
  v_candidato uuid;
  v_count integer;
begin
  for r in
    select t.id, t.area, t.sede_id
    from public.trabajos t
    where t.estado = 'pendiente'
      and t.tipo = 'interno'
      and t.participante_id is null
      and t.responsable_user_id is null
      and not exists (
        select 1
        from public.ecosistema_participantes ep_origen
        join public.participante_especialidades pe_origen
          on pe_origen.participante_id = ep_origen.id
        join public.especialidades e on e.id = pe_origen.especialidad_id
        where ep_origen.sede_id = t.sede_id
          and ep_origen.estado = 'activo'
          and e.activa = true
          and lower(trim(e.nombre)) = lower(trim(t.area))
      )
  loop
    select count(*), min(ep.id)
    into v_count, v_candidato
    from public.ecosistema_participantes ep
    join public.participante_especialidades pe
      on pe.participante_id = ep.id
    join public.especialidades e
      on e.id = pe.especialidad_id
    where ep.estado = 'activo'
      and ep.sede_id is not null
      and ep.sede_id <> r.sede_id
      and e.activa = true
      and lower(trim(e.nombre)) = lower(trim(r.area));

    if v_count = 1 then
      update public.trabajos
      set tipo = 'externo',
          participante_id = v_candidato,
          responsable_user_id = null,
          updated_at = now()
      where id = r.id;
    end if;
  end loop;
end;
$reconcile$;

notify pgrst, 'reload schema';

commit;
