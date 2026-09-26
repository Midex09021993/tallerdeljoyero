-- Trazabilidad del origen comercial del Pedido.
-- La fuente de verdad es cotizacion_id: si existe, el origen es cotizacion.
-- Si no existe, el pedido es directo y no se fuerza el uso del módulo Cotizaciones.

alter table public.pedidos
  add column if not exists cotizacion_id uuid,
  add column if not exists origen_comercial text not null default 'directo';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pedidos_cotizacion_id_fkey'
      and conrelid = 'public.pedidos'::regclass
  ) then
    alter table public.pedidos
      add constraint pedidos_cotizacion_id_fkey
      foreign key (cotizacion_id)
      references public.cotizaciones(id)
      on delete set null;
  end if;
end
$$;

-- Normaliza cualquier dato existente antes de endurecer la regla.
update public.pedidos
set origen_comercial = case
  when cotizacion_id is not null then 'cotizacion'
  else 'directo'
end
where origen_comercial is distinct from case
  when cotizacion_id is not null then 'cotizacion'
  else 'directo'
end;

alter table public.pedidos
  drop constraint if exists pedidos_origen_comercial_check;

alter table public.pedidos
  add constraint pedidos_origen_comercial_check
  check (origen_comercial in ('cotizacion', 'directo'));

create index if not exists pedidos_cotizacion_id_idx
  on public.pedidos(cotizacion_id);

create or replace function public.sincronizar_origen_comercial_pedido()
returns trigger
language plpgsql
security invoker
set search_path = public
as $function$
begin
  if new.cotizacion_id is not null then
    new.origen_comercial := 'cotizacion';
  elsif new.origen_comercial = 'cotizacion' then
    raise exception 'Un pedido con origen comercial cotizacion debe tener cotizacion_id';
  else
    new.origen_comercial := 'directo';
  end if;

  return new;
end;
$function$;

drop trigger if exists pedidos_sincronizar_origen_comercial
on public.pedidos;

create trigger pedidos_sincronizar_origen_comercial
before insert or update of cotizacion_id, origen_comercial
on public.pedidos
for each row
execute function public.sincronizar_origen_comercial_pedido();

comment on column public.pedidos.origen_comercial is
  'Origen comercial derivado: cotizacion cuando cotizacion_id existe; directo cuando el pedido se registra sin usar Cotizaciones.';

comment on column public.pedidos.cotizacion_id is
  'Cotización aprobada que originó el pedido, cuando corresponde.';
