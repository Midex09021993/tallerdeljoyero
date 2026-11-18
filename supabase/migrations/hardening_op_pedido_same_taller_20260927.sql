-- Hardening: una OP solo puede crearse para un pedido del mismo taller.
drop policy if exists "op crear operativo" on public.ordenes_produccion;

create policy "op crear operativo"
on public.ordenes_produccion
for insert to authenticated
with check (
  ve_sede(auth.uid(), sede_id)
  and (
    es_admin(auth.uid())
    or has_role(auth.uid(), 'operario'::app_role)
    or has_role(auth.uid(), 'monitor'::app_role)
  )
  and exists (
    select 1 from public.pedidos p
    where p.id = ordenes_produccion.pedido_id
      and p.sede_id = ordenes_produccion.sede_id
  )
);
