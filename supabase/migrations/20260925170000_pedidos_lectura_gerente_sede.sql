-- Alcance de lectura de pedidos por sede para administración de sede.
-- La rama de gerente se resuelve directamente contra user_roles + profiles
-- para no depender de la cadena es_interno/mi_sede/ve_sede.
drop policy if exists "pedidos por sede" on public.pedidos;
drop policy if exists "pedidos leer sede" on public.pedidos;
drop policy if exists "pedidos leer asignados o supervision" on public.pedidos;
drop policy if exists "pedidos leer por alcance operativo" on public.pedidos;

create policy "pedidos leer por alcance operativo"
on public.pedidos
for select
to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and sede_id = (
      select p.sede_id
      from public.profiles p
      where p.id = (select auth.uid())
    )
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
