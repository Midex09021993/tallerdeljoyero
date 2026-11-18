-- Consolidate overlapping RLS policies found during the ERP deep audit.
-- Access semantics remain unchanged; this removes redundant SELECT policy evaluation
-- and uses init-plan-friendly (select auth.uid()) expressions.

drop policy if exists "material areas gestionar admin" on public.material_areas;
drop policy if exists "material areas leer por sede" on public.material_areas;
create policy "material areas leer por sede" on public.material_areas for select to authenticated
using (exists (select 1 from public.inventario m where m.id = material_areas.material_id and ve_sede((select auth.uid()), m.sede_id)));
create policy "material areas crear admin" on public.material_areas for insert to authenticated
with check (es_admin((select auth.uid())) and exists (select 1 from public.inventario m where m.id = material_areas.material_id and ve_sede((select auth.uid()), m.sede_id)));
create policy "material areas actualizar admin" on public.material_areas for update to authenticated
using (es_admin((select auth.uid())) and exists (select 1 from public.inventario m where m.id = material_areas.material_id and ve_sede((select auth.uid()), m.sede_id)))
with check (es_admin((select auth.uid())) and exists (select 1 from public.inventario m where m.id = material_areas.material_id and ve_sede((select auth.uid()), m.sede_id)));
create policy "material areas borrar admin" on public.material_areas for delete to authenticated
using (es_admin((select auth.uid())) and exists (select 1 from public.inventario m where m.id = material_areas.material_id and ve_sede((select auth.uid()), m.sede_id)));

drop policy if exists "tarifas mano obra admin" on public.tarifas_mano_obra;
drop policy if exists "tarifas mano obra sede" on public.tarifas_mano_obra;
create policy "tarifas mano obra leer sede" on public.tarifas_mano_obra for select to authenticated using (ve_sede((select auth.uid()), sede_id));
create policy "tarifas mano obra crear admin" on public.tarifas_mano_obra for insert to authenticated with check (es_admin((select auth.uid())) and ve_sede((select auth.uid()), sede_id));
create policy "tarifas mano obra actualizar admin" on public.tarifas_mano_obra for update to authenticated
using (es_admin((select auth.uid())) and ve_sede((select auth.uid()), sede_id))
with check (es_admin((select auth.uid())) and ve_sede((select auth.uid()), sede_id));
create policy "tarifas mano obra borrar admin" on public.tarifas_mano_obra for delete to authenticated using (es_admin((select auth.uid())) and ve_sede((select auth.uid()), sede_id));

drop policy if exists "trabajos_select" on public.trabajos;
drop policy if exists "trabajos_select_operativo" on public.trabajos;
drop policy if exists "trabajos_select_supervision" on public.trabajos;
create policy "trabajos_select" on public.trabajos for select to authenticated
using (
  es_admin((select auth.uid()))
  or (
    sede_id is not null and ve_sede((select auth.uid()), sede_id)
    and (
      responsable_user_id = (select auth.uid())
      or (participante_id is not null and exists (
        select 1 from public.participante_cuentas pc
        where pc.participante_id = trabajos.participante_id
          and pc.user_id = (select auth.uid())
          and pc.estado = 'activo'
      ))
      or exists (
        select 1 from public.user_areas ua
        where ua.user_id = (select auth.uid())
          and lower(trim(ua.area)) = lower(trim(trabajos.area))
      )
      or has_role((select auth.uid()), 'monitor'::app_role)
    )
  )
);
