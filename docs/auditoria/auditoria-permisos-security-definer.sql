-- Auditoría de solo lectura para ejecutar en el SQL Editor del proyecto Supabase
-- correcto (Lovable Cloud). No modifica roles, funciones, tablas ni políticas.
-- Ejecutar cada consulta por separado y guardar los resultados para clasificar
-- RPC públicas legítimas frente a funciones internas/de mantenimiento.

-- 1) Funciones SECURITY DEFINER y permisos efectivos de ejecución.
-- has_function_privilege considera permisos heredados y PUBLIC.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  p.prosecdef as security_definer,
  pg_get_userbyid(p.proowner) as owner_name,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute,
  p. proconfig as function_settings
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.prosecdef
  and n.nspname not in ('pg_catalog', 'information_schema')
order by n.nspname, p.proname, identity_arguments;

-- 2) Conteo resumido por rol para contrastar con Database Linter.
select
  count(*) filter (where has_function_privilege('anon', p.oid, 'EXECUTE')) as security_definer_executable_by_anon,
  count(*) filter (where has_function_privilege('authenticated', p.oid, 'EXECUTE')) as security_definer_executable_by_authenticated,
  count(*) as total_security_definer_functions
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.prosecdef
  and n.nspname not in ('pg_catalog', 'information_schema');

-- 3) Tablas con RLS habilitado pero sin políticas definidas.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r', 'p')
  and c.relrowsecurity
  and n.nspname = 'public'
  and not exists (
    select 1
    from pg_policies pol
    where pol.schemaname = n.nspname
      and pol.tablename = c.relname
  )
order by c.relname;

-- 4) Detalle de políticas existentes para las tablas del punto anterior
-- y para las funciones candidatas: usarlo junto al código fuente antes de
-- revocar EXECUTE. No aplicar REVOKE masivo.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
