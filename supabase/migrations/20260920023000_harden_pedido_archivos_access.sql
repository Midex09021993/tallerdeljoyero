-- Restringe archivos de pedidos a usuarios con acceso operativo real al pedido.
-- Los administradores/monitores mantienen acceso por sede; los operarios requieren
-- que su área corresponda al área actual del pedido o a un trabajo relacionado.

drop policy if exists "archivos pedidos leer sede" on public.pedido_archivos;
drop policy if exists "archivos pedidos crear operativo" on public.pedido_archivos;
drop policy if exists "archivos pedidos actualizar operativo" on public.pedido_archivos;

create policy "archivos pedidos leer autorizado"
on public.pedido_archivos for select to authenticated
using (
  exists (
    select 1 from public.pedidos p
    where p.id = pedido_archivos.pedido_id
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
          select 1 from public.trabajos t
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
);

create policy "archivos pedidos crear autorizado"
on public.pedido_archivos for insert to authenticated
with check (
  exists (
    select 1 from public.pedidos p
    where p.id = pedido_archivos.pedido_id
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
          select 1 from public.trabajos t
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
);

create policy "archivos pedidos actualizar autorizado"
on public.pedido_archivos for update to authenticated
using (
  exists (
    select 1 from public.pedidos p
    where p.id = pedido_archivos.pedido_id
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
          select 1 from public.trabajos t
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
)
with check (
  exists (
    select 1 from public.pedidos p
    where p.id = pedido_archivos.pedido_id
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
          select 1 from public.trabajos t
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
);

drop policy if exists "trabajo_archivos_insert_admin" on public.trabajo_archivos;

create policy "trabajo_archivos_insert_autorizado"
on public.trabajo_archivos for insert to authenticated
with check (
  exists (
    select 1 from public.trabajos t
    where t.id = trabajo_archivos.trabajo_id
      and (
        public.es_admin((select auth.uid()))
        or t.responsable_user_id = (select auth.uid())
        or (
          t.participante_id is not null
          and exists (
            select 1 from public.participante_cuentas pc
            where pc.participante_id = t.participante_id
              and pc.user_id = (select auth.uid())
              and pc.estado = 'activo'
          )
        )
      )
  )
  and exists (
    select 1
    from public.pedido_archivos pa
    join public.trabajos t on t.pedido_id = pa.pedido_id
    where pa.id = trabajo_archivos.pedido_archivo_id
      and t.id = trabajo_archivos.trabajo_id
  )
);

drop policy if exists "pedidos archivos leer" on storage.objects;
drop policy if exists "pedidos archivos subir" on storage.objects;
drop policy if exists "pedidos archivos actualizar" on storage.objects;
drop policy if exists "pedidos archivos borrar" on storage.objects;

create policy "pedidos archivos leer autorizado"
on storage.objects for select to authenticated
using (
  bucket_id = 'pedidos'
  and exists (
    select 1 from public.pedidos p
    where p.id = (nullif(split_part(name, '/', 1), ''))::uuid
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
          select 1 from public.trabajos t
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
);

create policy "pedidos archivos subir autorizado"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'pedidos'
  and exists (
    select 1 from public.pedidos p
    where p.id = (nullif(split_part(name, '/', 1), ''))::uuid
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
          select 1 from public.trabajos t
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
);

create policy "pedidos archivos actualizar autorizado"
on storage.objects for update to authenticated
using (
  bucket_id = 'pedidos'
  and exists (
    select 1 from public.pedidos p
    where p.id = (nullif(split_part(name, '/', 1), ''))::uuid
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
          select 1 from public.trabajos t
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
)
with check (
  bucket_id = 'pedidos'
  and exists (
    select 1 from public.pedidos p
    where p.id = (nullif(split_part(name, '/', 1), ''))::uuid
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
);

create policy "pedidos archivos borrar admin"
on storage.objects for delete to authenticated
using (
  bucket_id = 'pedidos'
  and public.es_admin((select auth.uid()))
  and exists (
    select 1 from public.pedidos p
    where p.id = (nullif(split_part(name, '/', 1), ''))::uuid
      and public.ve_sede((select auth.uid()), p.sede_id)
  )
);

revoke execute on function public.es_admin(uuid) from anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from anon, authenticated;
revoke execute on function public.mi_sede(uuid) from anon, authenticated;
revoke execute on function public.ve_sede(uuid, uuid) from anon, authenticated;
