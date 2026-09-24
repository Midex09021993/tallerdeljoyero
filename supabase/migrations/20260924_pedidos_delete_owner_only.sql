-- Pedidos: eliminación exclusivamente por Dueño.
-- La UI ya oculta esta acción a otros roles; esta política garantiza la misma
-- restricción en la capa de datos y evita que un gerente elimine por API.

drop policy if exists "pedidos borrar" on public.pedidos;

create policy "pedidos borrar"
on public.pedidos
for delete
to authenticated
using (
  public.has_role(auth.uid(), 'dueno')
  and public.ve_sede(auth.uid(), sede_id)
);
