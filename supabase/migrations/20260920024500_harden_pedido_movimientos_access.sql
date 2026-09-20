-- Restringe el historial de movimientos a usuarios realmente autorizados
-- sobre el área actual o trabajo relacionado del pedido.

drop policy if exists "mov pedidos crear operativo" on public.pedido_movimientos;

create policy "mov pedidos crear autorizado"
on public.pedido_movimientos for insert to authenticated
with check (
  exists (
    select 1 from public.pedidos p
    where p.id = pedido_movimientos.pedido_id
      and public.ve_sede((select auth.uid()), p.sede_id)
      and (
        public.es_admin((select auth.uid()))
        or public.has_role((select auth.uid()), 'monitor')
        or exists (
          select 1 from public.user_areas ua
          where ua.user_id = (select auth.uid())
            and lower(trim(ua.area)) = lower(trim(p.area_actual))
        )
        or exists (
          select 1
          from public.trabajos t
          where t.pedido_id = p.id
            and t.sede_id = p.sede_id
            and (
              t.responsable_user_id = (select auth.uid())
              or exists (
                select 1 from public.user_areas ua
                where ua.user_id = (select auth.uid())
                  and lower(trim(ua.area)) = lower(trim(t.area))
              )
            )
        )
      )
  )
  and (usuario_id is null or usuario_id = (select auth.uid()))
);