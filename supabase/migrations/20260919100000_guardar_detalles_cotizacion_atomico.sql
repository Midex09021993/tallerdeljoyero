create or replace function public.guardar_detalles_cotizacion(
  _cotizacion_id uuid,
  _detalles jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_estado text;
  item jsonb;
begin
  if not public.es_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  select estado into v_estado
  from public.cotizaciones
  where id = _cotizacion_id
  for update;

  if v_estado is null then
    raise exception 'Cotización no encontrada';
  end if;

  if v_estado not in ('borrador') then
    raise exception 'Solo se pueden editar cotizaciones en borrador';
  end if;

  if jsonb_typeof(_detalles) <> 'array' or jsonb_array_length(_detalles) = 0 then
    raise exception 'La cotización debe tener al menos una partida';
  end if;

  delete from public.cotizacion_detalles
  where cotizacion_id = _cotizacion_id;

  for item in select value from jsonb_array_elements(_detalles)
  loop
    insert into public.cotizacion_detalles (
      cotizacion_id, orden, tipo, descripcion, cantidad, unidad,
      costo_unitario, precio_unitario, metadata
    )
    values (
      _cotizacion_id,
      greatest(1, coalesce((item->>'orden')::integer, 1)),
      coalesce(nullif(item->>'tipo',''), 'otro'),
      btrim(coalesce(item->>'descripcion','')),
      greatest(0.001, coalesce((item->>'cantidad')::numeric, 1)),
      coalesce(nullif(item->>'unidad',''), 'und'),
      greatest(0, coalesce((item->>'costo_unitario')::numeric, 0)),
      greatest(0, coalesce((item->>'precio_unitario')::numeric, 0)),
      coalesce(item->'metadata', '{}'::jsonb)
    );
  end loop;
end;
$$;

comment on function public.guardar_detalles_cotizacion(uuid, jsonb)
is 'Reemplaza las partidas de una cotización en borrador de forma controlada; los triggers recalculan totales.';