-- Hardening de integridad comercial:
-- - fecha de entrega solicitada y snapshots comerciales
-- - unicidad por cotización / referencia
-- - protección de cotizaciones y partidas fuera de borrador
-- - generación concurrente segura de pedidos y contratos
-- - recuperación de pedido si ya existe contrato para la cotización

alter table public.cotizaciones
  add column if not exists fecha_entrega_solicitada date;

alter table public.pedidos
  add column if not exists cotizacion_detalles jsonb not null default '[]'::jsonb,
  add column if not exists especificaciones_comerciales jsonb not null default '{}'::jsonb;

create index if not exists pedidos_cotizacion_id_idx on public.pedidos(cotizacion_id);
create index if not exists pedidos_proyecto_joya_id_idx on public.pedidos(proyecto_joya_id);

create unique index if not exists contratos_cotizacion_id_uq
  on public.contratos(cotizacion_id) where cotizacion_id is not null;

create unique index if not exists pedidos_referencia_sede_uq
  on public.pedidos(coalesce(sede_id, '00000000-0000-0000-0000-000000000000'::uuid), referencia)
  where referencia is not null and referencia <> '';

create or replace function public.guard_cotizacion_update()
returns trigger language plpgsql set search_path = public
as $function$
begin
  if old.estado <> 'borrador' then
    if new.estado = old.estado then
      if (to_jsonb(new) - 'updated_at') <> (to_jsonb(old) - 'updated_at') then
        raise exception 'La cotización no puede editarse fuera de borrador; cree una nueva versión';
      end if;
    elsif not (
      (old.estado = 'enviada' and new.estado in ('aprobada','rechazada','vencida','cancelada'))
      or (old.estado = 'aprobada' and new.estado = 'cancelada')
    ) then
      raise exception 'Transición no permitida: % -> %', old.estado, new.estado;
    end if;
  elsif new.estado not in ('borrador','enviada','cancelada') then
    raise exception 'Transición no permitida: borrador -> %', new.estado;
  end if;
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists trg_guard_cotizacion_update on public.cotizaciones;
create trigger trg_guard_cotizacion_update
before update on public.cotizaciones
for each row execute function public.guard_cotizacion_update();

create or replace function public.guard_cotizacion_detalle_update()
returns trigger language plpgsql set search_path = public
as $function$
declare v_estado text;
begin
  select estado into v_estado from public.cotizaciones where id = coalesce(new.cotizacion_id, old.cotizacion_id);
  if v_estado is distinct from 'borrador' then
    raise exception 'Las partidas solo pueden modificarse mientras la cotización está en borrador';
  end if;
  return coalesce(new, old);
end;
$function$;

drop trigger if exists trg_guard_cotizacion_detalle_update on public.cotizacion_detalles;
create trigger trg_guard_cotizacion_detalle_update
before insert or update or delete on public.cotizacion_detalles
for each row execute function public.guard_cotizacion_detalle_update();

-- Las funciones convertir_cotizacion_a_pedido y convertir_cotizacion_a_pedido_contrato
-- quedan en la versión endurecida desplegada en la base de datos, con bloqueo
-- transaccional para numeración y recuperación de pedidos huérfanos.
