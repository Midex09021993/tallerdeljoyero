-- Completa el modelo de archivos de pedido y endurece el acceso operativo.
-- La versión vigente es administrativa: el operario puede leerla, pero no cambiarla.

alter table public.pedido_archivos
  add column if not exists grupo text not null default '',
  add column if not exists version integer not null default 1,
  add column if not exists poster text,
  add column if not exists es_vigente_fabricacion boolean not null default false;

update public.pedido_archivos
set grupo = lower(trim(nombre))
where coalesce(grupo, '') = '';

alter table public.pedido_archivos
  drop constraint if exists pedido_archivos_version_check;

alter table public.pedido_archivos
  add constraint pedido_archivos_version_check check (version > 0);

create index if not exists pedido_archivos_pedido_grupo_version_idx
  on public.pedido_archivos (pedido_id, grupo, version desc);

create unique index if not exists pedido_archivos_unico_vigente_fabricacion_idx
  on public.pedido_archivos (pedido_id, grupo)
  where es_vigente_fabricacion = true and grupo <> '';

drop policy if exists "pedidos actualizar operativo" on public.pedidos;
create policy "pedidos actualizar solo administracion"
on public.pedidos for update to authenticated
using (public.es_admin((select auth.uid())))
with check (public.es_admin((select auth.uid())));

drop policy if exists "pedido materiales actualizar operativo" on public.pedido_materiales;
create policy "pedido materiales actualizar solo administracion"
on public.pedido_materiales for update to authenticated
using (
  exists (
    select 1 from public.pedidos p
    where p.id = pedido_materiales.pedido_id
      and public.ve_sede((select auth.uid()), p.sede_id)
  )
  and public.es_admin((select auth.uid()))
)
with check (
  exists (
    select 1 from public.pedidos p
    where p.id = pedido_materiales.pedido_id
      and public.ve_sede((select auth.uid()), p.sede_id)
  )
  and public.es_admin((select auth.uid()))
  and exists (
    select 1 from public.inventario i
    where i.id = pedido_materiales.material_id
      and public.ve_sede((select auth.uid()), i.sede_id)
      and i.activo
  )
  and pedido_materiales.cantidad_planificada > 0
);

drop policy if exists "pedido materiales borrar operativo" on public.pedido_materiales;
create policy "pedido materiales borrar solo administracion"
on public.pedido_materiales for delete to authenticated
using (
  exists (
    select 1 from public.pedidos p
    where p.id = pedido_materiales.pedido_id
      and public.ve_sede((select auth.uid()), p.sede_id)
  )
  and public.es_admin((select auth.uid()))
);

drop policy if exists "archivos pedidos actualizar autorizado" on public.pedido_archivos;
create policy "archivos pedidos actualizar solo administracion"
on public.pedido_archivos for update to authenticated
using (public.es_admin((select auth.uid())))
with check (public.es_admin((select auth.uid())));

create or replace function public.validar_archivo_vigente_fabricacion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.es_vigente_fabricacion = true
     and (new.grupo is null or btrim(new.grupo) = '') then
    raise exception 'Un archivo vigente para fabricación debe pertenecer a un grupo';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validar_archivo_vigente_fabricacion on public.pedido_archivos;
create trigger trg_validar_archivo_vigente_fabricacion
before insert or update on public.pedido_archivos
for each row execute function public.validar_archivo_vigente_fabricacion();
