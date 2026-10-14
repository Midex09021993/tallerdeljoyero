-- Aurum Lab: configuración inicial de cuotas comerciales por plan.
-- Aplicar manualmente en Supabase SQL Editor antes de usar la sección de cuotas.
-- Esta migración configura valores; todavía no bloquea operaciones de negocio.

create table if not exists public.aurum_plan_quotas (
  plan_id text primary key check (plan_id in ('emprendedor','taller','profesional','empresarial')),
  operaciones_comerciales_mes integer not null check (operaciones_comerciales_mes >= -1),
  almacenamiento_mib integer not null check (almacenamiento_mib >= -1),
  usos_render_mes integer not null check (usos_render_mes >= -1),
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null
);

insert into public.aurum_plan_quotas
  (plan_id, operaciones_comerciales_mes, almacenamiento_mib, usos_render_mes)
values
  ('emprendedor', 30, 250, 10),
  ('taller', 300, 2048, 50),
  ('profesional', 1500, 10240, 250),
  ('empresarial', -1, -1, -1)
on conflict (plan_id) do nothing;

alter table public.aurum_plan_quotas enable row level security;
revoke all on public.aurum_plan_quotas from anon, authenticated;
grant select, update on public.aurum_plan_quotas to authenticated;

drop policy if exists aurum_plan_quotas_owner_select on public.aurum_plan_quotas;
create policy aurum_plan_quotas_owner_select
on public.aurum_plan_quotas for select to authenticated
using (public.has_role((select auth.uid()), 'dueno'::public.app_role));

drop policy if exists aurum_plan_quotas_owner_update on public.aurum_plan_quotas;
create policy aurum_plan_quotas_owner_update
on public.aurum_plan_quotas for update to authenticated
using (public.has_role((select auth.uid()), 'dueno'::public.app_role))
with check (public.has_role((select auth.uid()), 'dueno'::public.app_role));

comment on table public.aurum_plan_quotas is
'Cuotas mensuales configurables de Aurum Lab por plan. -1 significa sin límite. Solo configuración; no aplica bloqueos por sí sola.';
