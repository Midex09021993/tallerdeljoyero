-- Permite que una cotización con cambios solicitados siga siendo consultable por su código corto.
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
        and c.estado in ('enviada', 'requiere_revision', 'aprobada', 'rechazada', 'vencida')
      limit 1
    )
  );
$$;

revoke all on function public.seguimiento_cotizacion_codigo(text) from public, anon, authenticated;
grant execute on function public.seguimiento_cotizacion_codigo(text) to anon;
