-- Los servicios externos reciben los archivos técnicos del pedido de origen.
-- Nunca se comparten costos ni información comercial por esta vía.

drop policy if exists "archivos pedidos leer autorizado" on public.pedido_archivos;

create policy "archivos pedidos leer autorizado"
on public.pedido_archivos
for select
to authenticated
using (
  exists (
    select 1
    from public.pedidos p
    where p.id = pedido_archivos.pedido_id
      and (
        -- Acceso normal del taller de origen.
        (
          public.ve_sede((select auth.uid()), p.sede_id)
          and (
            public.es_admin((select auth.uid()))
            or public.has_role((select auth.uid()), 'monitor')
            or exists (
              select 1
              from public.user_areas ua
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
                    select 1
                    from public.user_areas ua
                    where ua.user_id = (select auth.uid())
                      and lower(trim(ua.area)) = lower(trim(t.area))
                  )
                )
            )
          )
        )
        or
        -- Acceso del taller receptor cuando existe un servicio externo
        -- asociado al mismo pedido y participante.
        exists (
          select 1
          from public.trabajos t
          join public.participante_cuentas pc
            on pc.participante_id = t.participante_id
           and pc.user_id = (select auth.uid())
           and pc.estado = 'activo'
          where t.pedido_id = p.id
            and t.tipo = 'externo'
            and t.participante_id is not null
            and (
              public.has_role((select auth.uid()), 'dueno')
              or public.has_role((select auth.uid()), 'gerente')
              or public.has_role((select auth.uid()), 'operario')
            )
        )
      )
  )
);

drop policy if exists "pedidos archivos leer autorizado" on storage.objects;

create policy "pedidos archivos leer autorizado"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'pedidos'
  and exists (
    select 1
    from public.pedidos p
    where p.id = (nullif(split_part(name, '/', 1), ''))::uuid
      and (
        (
          public.ve_sede((select auth.uid()), p.sede_id)
          and (
            public.es_admin((select auth.uid()))
            or public.has_role((select auth.uid()), 'monitor')
            or exists (
              select 1
              from public.user_areas ua
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
                    select 1
                    from public.user_areas ua
                    where ua.user_id = (select auth.uid())
                      and lower(trim(ua.area)) = lower(trim(t.area))
                  )
                )
            )
          )
        )
        or exists (
          select 1
          from public.trabajos t
          join public.participante_cuentas pc
            on pc.participante_id = t.participante_id
           and pc.user_id = (select auth.uid())
           and pc.estado = 'activo'
          where t.pedido_id = p.id
            and t.tipo = 'externo'
            and t.participante_id is not null
            and (
              public.has_role((select auth.uid()), 'dueno')
              or public.has_role((select auth.uid()), 'gerente')
              or public.has_role((select auth.uid()), 'operario')
            )
        )
      )
  )
);

notify pgrst, 'reload schema';
