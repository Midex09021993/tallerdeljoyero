-- Garantiza el alcance funcional de Pedidos:
-- dueño: todas las sedes; gerente: todos los pedidos de su sede;
-- monitor: todos los pedidos de su sede; operario: pedidos de su sede
-- cuando tiene trabajo asignado o su área interviene.
create schema if not exists private;

create or replace function private.usuario_puede_pedido(_pedido_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.pedidos p
    where p.id = _pedido_id
      and public.ve_sede((select auth.uid()), p.sede_id)
      and (
        public.es_admin((select auth.uid()))
        or public.has_role((select auth.uid()), 'monitor'::public.app_role)
        or exists (
          select 1
          from public.trabajos t
          where t.pedido_id = p.id
            and t.sede_id = p.sede_id
            and (
              t.responsable_user_id = (select auth.uid())
              or exists (
                select 1
                from public.user_areas ua
                where ua.user_id = (select auth.uid())
                  and lower(trim(ua.area)) = lower(trim(t.area))
              )
            )
        )
      )
  );
$$;

revoke all on function private.usuario_puede_pedido(uuid) from public, anon, authenticated;

drop policy if exists "pedidos leer sede" on public.pedidos;
drop policy if exists "pedidos leer asignados o supervision" on public.pedidos;

create policy "pedidos leer por alcance operativo"
on public.pedidos
for select
to authenticated
using ((select private.usuario_puede_pedido(id)));
