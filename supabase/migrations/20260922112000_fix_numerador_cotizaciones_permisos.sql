-- Asegura que el generador de consecutivos pueda ejecutarse desde la RPC
-- comercial sin exponer la tabla de numeradores al cliente.
revoke all on function public.siguiente_numero_cotizacion(uuid, integer) from public, anon;
grant execute on function public.siguiente_numero_cotizacion(uuid, integer) to authenticated;

-- La función ya es SECURITY DEFINER; esta recreación garantiza que el atributo
-- se mantenga después de despliegues que hayan aplicado una versión previa.
alter function public.siguiente_numero_cotizacion(uuid, integer)
  security definer
  set search_path = public;

