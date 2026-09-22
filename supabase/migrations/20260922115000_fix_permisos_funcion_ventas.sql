-- Corrige permisos de ejecución de la función privada usada por las políticas
-- y por las RPC de ventas/cotizaciones.
--
-- La función sigue siendo SECURITY DEFINER y permanece fuera de public/anon.
-- authenticated necesita EXECUTE porque las políticas RLS y las RPC invocan
-- esta función durante operaciones realizadas por usuarios autenticados.

grant execute on function private.usuario_puede_ventas(uuid, uuid) to authenticated;
