create table if not exists public.cotizacion_documentos_publicos (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid not null references public.cotizaciones(id) on delete cascade,
  version integer not null,
  storage_path text not null unique,
  public_url text not null,
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (cotizacion_id, version)
);

create index if not exists cotizacion_documentos_publicos_cotizacion_idx
  on public.cotizacion_documentos_publicos(cotizacion_id, version desc);

alter table public.cotizacion_documentos_publicos enable row level security;

drop policy if exists "cotizacion documentos ver sede" on public.cotizacion_documentos_publicos;
create policy "cotizacion documentos ver sede"
on public.cotizacion_documentos_publicos
for select
to authenticated
using (
  exists (
    select 1
    from public.cotizaciones c
    where c.id = cotizacion_id
      and public.ve_sede((select auth.uid()), c.sede_id)
  )
);

drop policy if exists "cotizacion documentos crear comercial" on public.cotizacion_documentos_publicos;
create policy "cotizacion documentos crear comercial"
on public.cotizacion_documentos_publicos
for insert
to authenticated
with check (
  exists (
    select 1
    from public.cotizaciones c
    where c.id = cotizacion_id
      and public.ve_sede((select auth.uid()), c.sede_id)
      and (
        public.es_admin((select auth.uid()))
        or exists (
          select 1
          from public.user_areas ua
          where ua.user_id = (select auth.uid())
            and lower(trim(ua.area)) = lower('Área ventas')
        )
      )
  )
);

drop policy if exists "cotizacion documentos actualizar comercial" on public.cotizacion_documentos_publicos;
create policy "cotizacion documentos actualizar comercial"
on public.cotizacion_documentos_publicos
for update
to authenticated
using (
  exists (
    select 1
    from public.cotizaciones c
    where c.id = cotizacion_id
      and public.ve_sede((select auth.uid()), c.sede_id)
      and (
        public.es_admin((select auth.uid()))
        or exists (
          select 1
          from public.user_areas ua
          where ua.user_id = (select auth.uid())
            and lower(trim(ua.area)) = lower('Área ventas')
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.cotizaciones c
    where c.id = cotizacion_id
      and public.ve_sede((select auth.uid()), c.sede_id)
      and (
        public.es_admin((select auth.uid()))
        or exists (
          select 1
          from public.user_areas ua
          where ua.user_id = (select auth.uid())
            and lower(trim(ua.area)) = lower('Área ventas')
        )
      )
  )
);

drop policy if exists "cotizacion documentos borrar admin" on public.cotizacion_documentos_publicos;
create policy "cotizacion documentos borrar admin"
on public.cotizacion_documentos_publicos
for delete
to authenticated
using (public.es_admin((select auth.uid())));

revoke all on public.cotizacion_documentos_publicos from anon;
grant select, insert, update, delete on public.cotizacion_documentos_publicos to authenticated;
grant all on public.cotizacion_documentos_publicos to service_role;

drop policy if exists "cotizaciones publicas leer personal" on storage.objects;
create policy "cotizaciones publicas leer personal"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'cotizaciones-publicas'
  and exists (
    select 1
    from public.cotizacion_documentos_publicos d
    join public.cotizaciones c on c.id = d.cotizacion_id
    where d.storage_path = storage.objects.name
      and public.ve_sede((select auth.uid()), c.sede_id)
  )
);