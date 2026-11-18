-- Ajuste de compatibilidad: la tabla de producción no tiene columna metadata.
create or replace function public.guardar_detalles_cotizacion(
  _cotizacion_id uuid,
  _detalles jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cotizacion public.cotizaciones%rowtype;
  item jsonb;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;

  select * into v_cotizacion
  from public.cotizaciones
  where id = _cotizacion_id
  for update;

  if not found then raise exception 'Cotización no encontrada'; end if;

  if not public.es_admin(auth.uid())
     and not private.usuario_puede_ventas(auth.uid(), v_cotizacion.sede_id) then
    raise exception 'No tienes permiso para editar esta cotización';
  end if;

  if v_cotizacion.estado <> 'borrador' then
    raise exception 'Solo se pueden editar cotizaciones en borrador';
  end if;

  if jsonb_typeof(_detalles) <> 'array' or jsonb_array_length(_detalles) = 0 then
    raise exception 'La cotización debe tener al menos una partida';
  end if;

  delete from public.cotizacion_detalles where cotizacion_id = _cotizacion_id;

  for item in select value from jsonb_array_elements(_detalles)
  loop
    insert into public.cotizacion_detalles (
      cotizacion_id, orden, tipo, descripcion, cantidad, unidad,
      costo_unitario, precio_unitario, total_costo, total_precio
    )
    values (
      _cotizacion_id,
      greatest(1, coalesce((item->>'orden')::integer, 1)),
      coalesce(nullif(item->>'tipo', ''), 'otro'),
      btrim(coalesce(item->>'descripcion', '')),
      greatest(0.001, coalesce((item->>'cantidad')::numeric, 1)),
      coalesce(nullif(item->>'unidad', ''), 'und'),
      greatest(0, coalesce((item->>'costo_unitario')::numeric, 0)),
      greatest(0, coalesce((item->>'precio_unitario')::numeric, 0)),
      greatest(0, coalesce((item->>'cantidad')::numeric, 1)) * greatest(0, coalesce((item->>'costo_unitario')::numeric, 0)),
      greatest(0, coalesce((item->>'cantidad')::numeric, 1)) * greatest(0, coalesce((item->>'precio_unitario')::numeric, 0))
    );
  end loop;

  update public.cotizaciones q
  set
    subtotal_costo = coalesce((select sum(total_costo) from public.cotizacion_detalles where cotizacion_id = q.id), 0),
    subtotal = coalesce((select sum(total_precio) from public.cotizacion_detalles where cotizacion_id = q.id), 0),
    total = greatest(
      0,
      coalesce((select sum(total_precio) from public.cotizacion_detalles where cotizacion_id = q.id), 0)
      - q.descuento + q.impuestos
    ),
    updated_at = now()
  where q.id = _cotizacion_id;
end;
$$;

revoke all on function public.guardar_detalles_cotizacion(uuid, jsonb) from public, anon;
grant execute on function public.guardar_detalles_cotizacion(uuid, jsonb) to authenticated;
