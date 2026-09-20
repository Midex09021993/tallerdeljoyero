drop policy if exists "clientes delete" on public.clientes;

create policy "clientes delete solo dueno"
on public.clientes
for delete
to authenticated
using (
  has_role((select auth.uid()), 'dueno'::app_role)
);
