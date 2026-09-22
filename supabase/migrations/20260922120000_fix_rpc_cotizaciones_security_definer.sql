-- Corrige el flujo de creación de Cotizaciones para que la RPC aplique
-- su propia autorización y no quede bloqueada por el RLS del usuario invocador.
-- La función ya valida auth.uid() y private.usuario_puede_ventas().

alter function public.crear_cotizacion_comercial(
  uuid,text,text,text,uuid,uuid,text,numeric,numeric,numeric,numeric,numeric,date,date,text,text,text
) security definer;

alter function public.crear_cotizacion_comercial(
  uuid,text,text,text,uuid,uuid,text,numeric,numeric,numeric,numeric,numeric,date,date,text,text,text
) set search_path = '';

grant execute on function public.crear_cotizacion_comercial(
  uuid,text,text,text,uuid,uuid,text,numeric,numeric,numeric,numeric,numeric,date,date,text,text,text
) to authenticated;

grant usage on schema private to authenticated;
grant execute on function private.usuario_puede_ventas(uuid,uuid) to authenticated;
