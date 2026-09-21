-- Endurece el portal público de consulta de cotizaciones.
-- La función privada nunca queda ejecutable por clientes públicos.
-- El único punto de entrada público es el wrapper controlado.

revoke all on function private_api.seguimiento_cotizacion(text) from public, anon, authenticated;
revoke all on schema private_api from public, anon, authenticated;

create or replace function public.seguimiento_cotizacion(_token text)
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
  from private_api.seguimiento_cotizacion(_token);
$$;

revoke all on function public.seguimiento_cotizacion(text) from public, authenticated;
grant execute on function public.seguimiento_cotizacion(text) to anon;
