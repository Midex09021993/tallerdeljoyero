-- Reaplica las RPC críticas del flujo operario en Lovable Cloud.
-- Esta migración tiene timestamp posterior a las migraciones existentes para que
-- Lovable Cloud la procese aunque las migraciones históricas ya estén registradas.

-- Migración definitiva: reemplaza cualquier definición histórica de preparar_produccion_pedido.
-- El estado inicial de una OP debe ser 'borrador'; 'planificada' NO pertenece al dominio actual.

drop function if exists public.preparar_produccion_pedido(uuid);

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


-- Seguridad: la RPC queda disponible únicamente para usuarios autenticados.
revoke all on function public.preparar_produccion_pedido(uuid) from public, anon;
grant execute on function public.preparar_produccion_pedido(uuid) to authenticated;


-- Bandeja operativa del operario: lectura explícita y segura de trabajos propios
-- y trabajos libres dentro de sus áreas. Evita depender de la forma de la consulta
-- del cliente y mantiene la autorización en PostgreSQL.

create or replace function public.listar_trabajos_operario()
returns table (
  id uuid,
  pedido_id uuid,
  area text,
  ubicacion text,
  titulo text,
  descripcion text,
  estado text,
  prioridad text,
  tipo text,
  fecha_planificada date,
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  notas text,
  responsable_user_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not public.has_role(v_uid, 'operario') then
    raise exception 'Solo un operario puede consultar su bandeja';
  end if;

  return query
  select
    t.id,
    t.pedido_id,
    t.area,
    t.ubicacion,
    t.titulo,
    t.descripcion,
    t.estado,
    t.prioridad,
    t.tipo,
    t.fecha_planificada,
    t.fecha_inicio,
    t.fecha_fin,
    t.notas,
    t.responsable_user_id
  from public.trabajos t
  where t.estado in ('pendiente', 'en_proceso', 'bloqueado')
    and public.ve_sede(v_uid, t.sede_id)
    and (
      t.responsable_user_id = v_uid
      or (
        t.responsable_user_id is null
        and exists (
          select 1
          from public.user_areas ua
          where ua.user_id = v_uid
            and lower(trim(ua.area)) = lower(trim(t.area))
        )
      )
    )
  order by t.fecha_planificada nulls first, t.created_at;
end;
$$;

revoke all on function public.listar_trabajos_operario() from public, anon;
grant execute on function public.listar_trabajos_operario() to authenticated;

comment on function public.listar_trabajos_operario() is
  'Bandeja segura del operario: trabajos propios y operaciones libres de sus áreas en su misma sede.';


notify pgrst, 'reload schema';
