-- AURUM LAB: permitir que gerentes consulten la configuración global de cuotas.
-- Ejecutar manualmente en SQL Editor del Supabase de PRODUCCIÓN administrado por Lovable.
-- Solo lectura para gerentes; la edición de cuotas sigue reservada al dueño.
-- No cambia planes asignados ni valores de cuotas.

begin;

drop policy if exists aurum_plan_quotas_manager_select
  on public.aurum_plan_quotas;

create policy aurum_plan_quotas_manager_select
on public.aurum_plan_quotas
for select
to authenticated
using (
  public.has_role((select auth.uid()), 'gerente'::public.app_role)
);

commit;
