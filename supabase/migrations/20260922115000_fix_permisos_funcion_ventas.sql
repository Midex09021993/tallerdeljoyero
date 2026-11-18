-- Corrige permisos de ejecución de la función privada usada por las políticas
-- y por las RPC de ventas/cotizaciones.
-- El esquema privado permanece fuera del acceso de lectura/escritura;
-- solo se concede USAGE para que PostgreSQL pueda resolver la función autorizada.
--
-- La función sigue siendo SECURITY DEFINER y permanece fuera de public/anon.
-- authenticated necesita EXECUTE porque las políticas RLS y las RPC invocan
-- esta función durante operaciones realizadas por usuarios autenticados.

grant usage on schema private to authenticated;
grant execute on function private.usuario_puede_ventas(uuid, uuid) to authenticated;
