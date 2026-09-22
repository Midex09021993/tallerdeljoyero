-- Alinea RLS comercial con el modelo operativo del ERP:
-- Área ventas puede crear y editar clientes/cotizaciones de su propia sede.
-- Dueño y gerente conservan la administración completa.

create or replace function private.usuario_puede_ventas(_uid uuid, _sede_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.es_admin(_uid)
    or (
      public.ve_sede(_uid, _sede_id)
      and exists (
        select 1
        from public.user_areas ua
        where ua.user_id = _uid
          and lower(trim(ua.area)) = lower('Área ventas')
      )
    );
$$;

revoke all on function private.usuario_puede_ventas(uuid, uuid) from public, anon;
grant execute on function private.usuario_puede_ventas(uuid, uuid) to authenticated;

-- Clientes
drop policy if exists "clientes manage" on public.clientes;
drop policy if exists "clientes update" on public.clientes;

create policy "clientes manage"
on public.clientes
for insert
to authenticated
with check (private.usuario_puede_ventas((select auth.uid()), sede_id));

create policy "clientes update"
on public.clientes
for update
to authenticated
using (private.usuario_puede_ventas((select auth.uid()), sede_id))
with check (private.usuario_puede_ventas((select auth.uid()), sede_id));

-- Cotizaciones
drop policy if exists "cotizaciones insert" on public.cotizaciones;
drop policy if exists "cotizaciones update" on public.cotizaciones;
drop policy if exists "cotizaciones delete" on public.cotizaciones;

create policy "cotizaciones insert"
on public.cotizaciones
for insert
to authenticated
with check (private.usuario_puede_ventas((select auth.uid()), sede_id));

create policy "cotizaciones update"
on public.cotizaciones
for update
to authenticated
using (private.usuario_puede_ventas((select auth.uid()), sede_id))
with check (private.usuario_puede_ventas((select auth.uid()), sede_id));

create policy "cotizaciones delete"
on public.cotizaciones
for delete
to authenticated
using (
  public.es_admin((select auth.uid()))
);

-- Detalles de cotización: heredan el control de sede/área de la cotización padre.
drop policy if exists "cotizacion_detalles insert" on public.cotizacion_detalles;
drop policy if exists "cotizacion_detalles update" on public.cotizacion_detalles;
drop policy if exists "cotizacion_detalles delete" on public.cotizacion_detalles;

create policy "cotizacion_detalles insert"
on public.cotizacion_detalles
for insert
to authenticated
with check (
  exists (
    select 1
    from public.cotizaciones c
    where c.id = cotizacion_detalles.cotizacion_id
      and private.usuario_puede_ventas((select auth.uid()), c.sede_id)
  )
);

create policy "cotizacion_detalles update"
on public.cotizacion_detalles
for update
to authenticated
using (
  exists (
    select 1
    from public.cotizaciones c
    where c.id = cotizacion_detalles.cotizacion_id
      and private.usuario_puede_ventas((select auth.uid()), c.sede_id)
  )
)
with check (
  exists (
    select 1
    from public.cotizaciones c
    where c.id = cotizacion_detalles.cotizacion_id
      and private.usuario_puede_ventas((select auth.uid()), c.sede_id)
  )
);

create policy "cotizacion_detalles delete"
on public.cotizacion_detalles
for delete
to authenticated
using (
  exists (
    select 1
    from public.cotizaciones c
    where c.id = cotizacion_detalles.cotizacion_id
      and private.usuario_puede_ventas((select auth.uid()), c.sede_id)
  )
);
