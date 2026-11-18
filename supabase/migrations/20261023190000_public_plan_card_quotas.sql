-- Publicar solo los límites comerciales necesarios para mostrar los planes en la pantalla de acceso.
-- No expone updated_by ni concede acceso público a la edición de cuotas.
grant select (plan_id, carpetas_mi_nube_max, almacenamiento_mib, productos_catalogo_max)
on table public.aurum_plan_quotas to anon;

drop policy if exists aurum_plan_quotas_public_plan_cards on public.aurum_plan_quotas;
create policy aurum_plan_quotas_public_plan_cards
on public.aurum_plan_quotas
for select
to anon
using (true);
