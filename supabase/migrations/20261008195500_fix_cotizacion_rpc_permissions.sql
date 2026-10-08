-- Corrige la autorización de la RPC de creación de cotizaciones.
-- La RPC valida el usuario internamente mediante private.usuario_puede_ventas().
-- Debe ejecutarse como SECURITY DEFINER para no exigir al usuario final
-- permisos sobre el esquema privado ni sobre tablas protegidas por RLS.

alter function public.crear_cotizacion_comercial(
  uuid,text,text,text,uuid,uuid,text,numeric,numeric,numeric,numeric,numeric,date,date,text,text,text
) security definer;

alter function public.crear_cotizacion_comercial(
  uuid,text,text,text,uuid,uuid,text,numeric,numeric,numeric,numeric,numeric,date,date,text,text,text
) set search_path = '';

revoke all on function public.crear_cotizacion_comercial(
  uuid,text,text,text,uuid,uuid,text,numeric,numeric,numeric,numeric,numeric,date,date,text,text,text
) from public, anon;

grant execute on function public.crear_cotizacion_comercial(
  uuid,text,text,text,uuid,uuid,text,numeric,numeric,numeric,numeric,numeric,date,date,text,text,text
) to authenticated;
