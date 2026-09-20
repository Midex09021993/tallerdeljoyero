-- Restrict operational users to their assigned production scope and expose a focused technical sheet.
create schema if not exists private;

create or replace function private.usuario_puede_pedido(_pedido_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.pedidos p
    where p.id = _pedido_id
      and public.ve_sede((select auth.uid()), p.sede_id)
      and (
        public.es_admin((select auth.uid()))
        or public.has_role((select auth.uid()), 'monitor'::public.app_role)
        or exists (
          select 1 from public.trabajos t
          where t.pedido_id = p.id and t.sede_id = p.sede_id
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
  );
$$;

create or replace function private.usuario_puede_material(_material_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.inventario i
    where i.id = _material_id
      and public.ve_sede((select auth.uid()), i.sede_id)
      and (
        public.es_admin((select auth.uid()))
        or public.has_role((select auth.uid()), 'monitor'::public.app_role)
        or exists (
          select 1 from public.pedido_materiales pm
          where pm.material_id = i.id
            and private.usuario_puede_pedido(pm.pedido_id)
        )
      )
  );
$$;

revoke all on schema private from public;
revoke all on function private.usuario_puede_pedido(uuid) from public, anon, authenticated;
revoke all on function private.usuario_puede_material(uuid) from public, anon, authenticated;

drop policy if exists "inventario leer sede" on public.inventario;
create policy "inventario leer administracion o materiales de trabajo"
on public.inventario for select to authenticated
using ((select private.usuario_puede_material(id)));

drop policy if exists "mov inventario leer sede" on public.inventario_movimientos;
create policy "mov inventario leer propio o supervision"
on public.inventario_movimientos for select to authenticated
using (
  usuario_id = (select auth.uid())
  or public.es_admin((select auth.uid()))
  or public.has_role((select auth.uid()), 'monitor'::public.app_role)
);

drop policy if exists "pedidos leer sede" on public.pedidos;
create policy "pedidos leer asignados o supervision"
on public.pedidos for select to authenticated
using ((select private.usuario_puede_pedido(id)));

drop policy if exists "pedido materiales leer sede" on public.pedido_materiales;
create policy "pedido materiales leer trabajo asignado"
on public.pedido_materiales for select to authenticated
using ((select private.usuario_puede_pedido(pedido_id)));

drop policy if exists "trabajo_archivos_select_asignado" on public.trabajo_archivos;
create policy "trabajo_archivos_select_area_asignada"
on public.trabajo_archivos for select to authenticated
using (
  exists (
    select 1 from public.trabajos t
    where t.id = trabajo_archivos.trabajo_id
      and (
        public.es_admin((select auth.uid()))
        or (
          t.sede_id is not null
          and public.ve_sede((select auth.uid()), t.sede_id)
          and (
            t.responsable_user_id = (select auth.uid())
            or (
              t.participante_id is not null
              and exists (
                select 1 from public.participante_cuentas pc
                where pc.participante_id = t.participante_id
                  and pc.user_id = (select auth.uid())
                  and pc.estado = 'activo'
              )
            )
            or exists (
              select 1 from public.user_areas ua
              where ua.user_id = (select auth.uid())
                and lower(trim(ua.area)) = lower(trim(t.area))
            )
          )
        )
      )
  )
);

drop policy if exists "tiempos leer sede" on public.trabajo_tiempos;
create policy "tiempos leer propios o supervision"
on public.trabajo_tiempos for select to authenticated
using (
  usuario_id = (select auth.uid())
  or public.es_admin((select auth.uid()))
  or public.has_role((select auth.uid()), 'monitor'::public.app_role)
);

drop policy if exists "incidencias_select_supervision" on public.incidencias_trabajo;
drop policy if exists "incidencias_trabajo_select" on public.incidencias_trabajo;
create policy "incidencias leer trabajo asignado"
on public.incidencias_trabajo for select to authenticated
using (
  public.es_admin((select auth.uid()))
  or reportado_por = (select auth.uid())
  or exists (
    select 1 from public.trabajos t
    where t.id = incidencias_trabajo.trabajo_id
      and t.sede_id is not null
      and public.ve_sede((select auth.uid()), t.sede_id)
      and (
        t.responsable_user_id = (select auth.uid())
        or public.has_role((select auth.uid()), 'monitor'::public.app_role)
        or exists (
          select 1 from public.user_areas ua
          where ua.user_id = (select auth.uid())
            and lower(trim(ua.area)) = lower(trim(t.area))
        )
      )
  )
);

create index if not exists trabajos_pedido_id_idx on public.trabajos (pedido_id);
create index if not exists trabajos_area_sede_idx on public.trabajos (sede_id, area);
create index if not exists pedido_materiales_material_id_idx on public.pedido_materiales (material_id);
