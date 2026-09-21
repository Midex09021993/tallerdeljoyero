-- Documentos PDF públicos de cotizaciones.
-- El PDF se genera en una Edge Function usando datos comerciales sanitizados.
-- El bucket es público únicamente para lectura por enlace; la generación sigue
-- protegida por autenticación y control de sede/Área ventas.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cotizaciones-publicas',
  'cotizaciones-publicas',
  true,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

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
