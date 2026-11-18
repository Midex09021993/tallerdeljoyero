alter table public.cotizaciones drop constraint if exists cotizaciones_numero_key;

create or replace function public.cotizaciones_recalcular_totales()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_cotizacion_id uuid;
  v_subtotal_costo numeric(14,2);
  v_subtotal numeric(14,2);
  v_descuento numeric(14,2);
  v_impuestos numeric(14,2);
begin
  v_cotizacion_id := coalesce(new.cotizacion_id, old.cotizacion_id);

  select
    coalesce(sum(total_costo), 0)::numeric(14,2),
    coalesce(sum(total_precio), 0)::numeric(14,2)
  into v_subtotal_costo, v_subtotal
  from public.cotizacion_detalles
  where cotizacion_id = v_cotizacion_id;

  select descuento, impuestos
    into v_descuento, v_impuestos
  from public.cotizaciones
  where id = v_cotizacion_id
  for update;

  update public.cotizaciones
  set subtotal_costo = v_subtotal_costo,
      subtotal = v_subtotal,
      total = greatest(0, v_subtotal - coalesce(v_descuento, 0) + coalesce(v_impuestos, 0)),
      updated_at = now()
  where id = v_cotizacion_id;

  return coalesce(new, old);
end;
$$;

create or replace function public.cotizacion_detalle_calcular_totales()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.total_costo := round(new.cantidad * new.costo_unitario, 2);
  new.total_precio := round(new.cantidad * new.precio_unitario, 2);
  return new;
end;
$$;

drop trigger if exists cotizacion_detalle_calcular_totales on public.cotizacion_detalles;
create trigger cotizacion_detalle_calcular_totales
before insert or update of cantidad, costo_unitario, precio_unitario
on public.cotizacion_detalles
for each row execute function public.cotizacion_detalle_calcular_totales();

drop trigger if exists cotizaciones_recalcular_totales on public.cotizacion_detalles;
create trigger cotizaciones_recalcular_totales
after insert or update or delete on public.cotizacion_detalles
for each row execute function public.cotizaciones_recalcular_totales();

comment on column public.cotizaciones.numero is 'Identificador base de la cotización; puede repetirse entre versiones.';
comment on constraint cotizaciones_numero_version_key on public.cotizaciones is 'Cada número de cotización puede tener múltiples versiones, pero no se repite la misma versión.';
