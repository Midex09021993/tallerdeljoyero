-- AURUM LAB: permitir que la página pública lea también el límite de operaciones.
-- Ejecutar manualmente en SQL Editor de Supabase administrado por Lovable.
-- Solo amplía lectura anónima de una columna ya existente; no concede edición.

grant select (operaciones_comerciales_mes)
on table public.aurum_plan_quotas to anon;
