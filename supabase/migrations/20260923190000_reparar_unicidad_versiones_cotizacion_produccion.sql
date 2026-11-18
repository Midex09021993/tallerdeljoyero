-- Corrección idempotente para instalaciones de producción donde quedó activo
-- el índice histórico (sede_id, numero), que impide crear v2/v3 de una cotización.
--
-- No modifica ni elimina cotizaciones: solo corrige la regla de unicidad.
drop index if exists public.cotizaciones_sede_numero_unique;

create unique index if not exists cotizaciones_sede_numero_version_unique
  on public.cotizaciones (sede_id, numero, version)
  where sede_id is not null;

-- Reaplica el motor de creación de versiones para que producción use
-- exactamente la misma regla que main.
create or replace function public.crear_version_cotizacion(_cotizacion_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_original public.cotizaciones%rowtype;
  v_nueva_id uuid;
  v_nueva_version integer;
begin
  if not public.es_admin((select auth.uid())) then
    raise exception 'No autorizado';
  end if;

  select *
    into v_original
  from public.cotizaciones
  where id = _cotizacion_id
  for update;

  if not found then
    raise exception 'Cotización no encontrada';
  end if;

  if v_original.estado not in ('enviada','requiere_revision','rechazada','vencida') then
    raise exception 'Solo se puede crear una nueva versión desde una cotización enviada, con cambios solicitados, rechazada o vencida';
  end if;

  select coalesce(max(c.version), 0) + 1
    into v_nueva_version
  from public.cotizaciones c
  where c.sede_id is not distinct from v_original.sede_id
    and c.numero = v_original.numero;

  insert into public.cotizaciones (
    numero, version, cliente_id, proyecto_joya_id, sede_id, estado,
    fecha_emision, fecha_vencimiento, moneda,
    subtotal_costo, subtotal, descuento, impuestos, total, anticipo,
    notas_cliente, notas_internas,
    identidad_comercial_id, reemplaza_id, creado_por
  )
  values (
    v_original.numero, v_nueva_version, v_original.cliente_id, v_original.proyecto_joya_id,
    v_original.sede_id, 'borrador',
    current_date, v_original.fecha_vencimiento, v_original.moneda,
    v_original.subtotal_costo, v_original.subtotal, v_original.descuento,
    v_original.impuestos, v_original.total, 0,
    v_original.notas_cliente, v_original.notas_internas,
    v_original.identidad_comercial_id, v_original.id, (select auth.uid())
  )
  returning id into v_nueva_id;

  insert into public.cotizacion_detalles (
    cotizacion_id, orden, tipo, descripcion, cantidad, unidad,
    costo_unitario, precio_unitario, metadata
  )
  select
    v_nueva_id, orden, tipo, descripcion, cantidad, unidad,
    costo_unitario, precio_unitario, metadata
  from public.cotizacion_detalles
  where cotizacion_id = v_original.id
  order by orden;

  return v_nueva_id;
end;
$$;

revoke all on function public.crear_version_cotizacion(uuid) from public, anon;
grant execute on function public.crear_version_cotizacion(uuid) to authenticated;
