-- Migracion de autorizacion: elimina la ultima rama de pedidos que
-- consultaba profiles.sede_id directamente. El alcance de gerente pasa
-- por el mismo motor canonico ve_sede(), que resuelve usuario -> participante.

drop policy if exists "pedidos leer por alcance operativo" on public.pedidos;

create policy "pedidos leer por alcance operativo"
on public.pedidos
for select
to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
  or (
    public.ve_sede((select auth.uid()), sede_id)
    and (
      public.has_role((select auth.uid()), 'monitor'::public.app_role)
      or exists (
        select 1
        from public.trabajos t
        where t.pedido_id = pedidos.id
          and t.sede_id = pedidos.sede_id
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
  )
);

-- Auditoria de seguridad: no permitir que esta politica vuelva a depender
-- de profiles.sede_id/user_roles.sede_id para decidir el alcance.
