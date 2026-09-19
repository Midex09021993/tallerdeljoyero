alter table public.pedidos
  add column if not exists cotizacion_id uuid references public.cotizaciones(id) on delete set null,
  add column if not exists proyecto_joya_id uuid references public.proyectos_joya(id) on delete set null;

create index if not exists pedidos_cotizacion_id_idx on public.pedidos(cotizacion_id);
create index if not exists pedidos_proyecto_joya_id_idx on public.pedidos(proyecto_joya_id);

create or replace function public.convertir_cotizacion_a_pedido(_cotizacion_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_cot public.cotizaciones%rowtype;
  v_cliente public.clientes%rowtype;
  v_proyecto public.proyectos_joya%rowtype;
  v_pedido_id uuid;
  v_referencia text;
  v_existente uuid;
begin
  if not public.es_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  select * into v_cot from public.cotizaciones where id = _cotizacion_id for update;
  if not found then raise exception 'Cotización no encontrada'; end if;
  if v_cot.estado <> 'aprobada' then raise exception 'Solo se puede convertir una cotización aprobada'; end if;

  select id into v_existente from public.pedidos where cotizacion_id = _cotizacion_id limit 1;
  if v_existente is not null then return v_existente; end if;

  select * into v_cliente from public.clientes where id = v_cot.cliente_id;
  if not found then raise exception 'Cliente de la cotización no encontrado'; end if;

  if v_cot.proyecto_joya_id is not null then
    select * into v_proyecto from public.proyectos_joya where id = v_cot.proyecto_joya_id;
  end if;

  select coalesce(max(
    case when referencia ~ '^[A-Z]{2}-[0-9]+$' then substring(referencia from 4)::integer else 0 end
  ),0) + 1 into v_referencia
  from public.pedidos
  where sede_id is not distinct from v_cot.sede_id;

  v_referencia := 'PED-' || to_char(current_date,'YYYY') || '-' || lpad(v_referencia::text,5,'0');

  insert into public.pedidos (
    referencia, pieza, cliente, material, estado, entrega, importe,
    sede_id, telefono, origen, contrato, trabajo, fecha_ingreso, fecha_entrega,
    area_actual, ruta, notas, talla, cantidad_piezas, piedras, peso_estimado,
    cotizacion_id, proyecto_joya_id
  )
  values (
    v_referencia,
    coalesce(nullif(v_proyecto.nombre,''),'Pedido desde ' || v_cot.numero),
    v_cliente.nombre,
    coalesce(v_proyecto.metal,''),
    'Recibido',
    coalesce(v_cot.fecha_vencimiento::text,''),
    v_cot.total,
    v_cot.sede_id,
    coalesce(v_cliente.telefono,''),
    'Cotización ' || v_cot.numero || ' v' || v_cot.version,
    '',
    coalesce(nullif(v_proyecto.nombre,''),'Servicio de joyería'),
    current_date,
    v_cot.fecha_vencimiento,
    'Pedidos',
    ARRAY['Pedidos']::text[],
    coalesce(v_cot.notas_internas,''),
    coalesce(v_proyecto.talla,''),
    coalesce(v_proyecto.cantidad_piezas,1),
    coalesce(v_proyecto.piedras,''),
    coalesce(v_proyecto.peso_estimado::text,''),
    v_cot.id,
    v_cot.proyecto_joya_id
  )
  returning id into v_pedido_id;

  return v_pedido_id;
end;
$$;

comment on function public.convertir_cotizacion_a_pedido(uuid)
is 'Convierte una cotización aprobada en un pedido y conserva la relación comercial con la cotización y proyecto.';
