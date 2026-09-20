drop policy if exists "contratos select" on public.contratos;

create policy "contratos select"
on public.contratos
for select
to authenticated
using (
  has_role((select auth.uid()), 'dueno'::app_role)
  or (
    has_role((select auth.uid()), 'gerente'::app_role)
    and sede_id = mi_sede((select auth.uid()))
  )
);