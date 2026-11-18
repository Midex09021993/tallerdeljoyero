-- Agrega un código corto público para compartir cotizaciones sin exponer el UUID de seguimiento.
alter table public.cotizaciones
  add column if not exists seguimiento_codigo text
  not null
  default upper(substr(md5(gen_random_uuid()::text), 1, 8));

create unique index if not exists cotizaciones_seguimiento_codigo_uidx
  on public.cotizaciones (seguimiento_codigo);

create or replace function public.seguimiento_cotizacion_codigo(_codigo text)
returns table (
  numero text,
  version integer,
  cliente text,
  trabajo text,
  sede text,
  estado text,
  fecha_emision date,
  fecha_vencimiento date,
  fecha_entrega_solicitada date,
  moneda text,
  subtotal numeric,
  descuento numeric,
  impuestos numeric,
  total numeric,
  anticipo numeric,
  notas_cliente text,
  identidad_comercial jsonb,
  especificaciones jsonb,
  detalles jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select *
  from private_api.seguimiento_cotizacion(
    (
      select c.seguimiento_token::text
      from public.cotizaciones c
      where c.seguimiento_codigo = upper(trim(_codigo))
        and c.estado in ('enviada', 'aprobada', 'rechazada', 'vencida')
      limit 1
    )
  );
$$;

revoke all on function public.seguimiento_cotizacion_codigo(text) from public, anon, authenticated;
grant execute on function public.seguimiento_cotizacion_codigo(text) to anon;
