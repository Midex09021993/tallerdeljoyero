create table if not exists public.inventario_joyas_importaciones (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references public.sedes(id) on delete cascade,
  nombre_archivo text not null,
  filas_detectadas integer not null default 0,
  filas_importadas integer not null default 0,
  filas_con_revision integer not null default 0,
  creado_por uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.inventario_joyas (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references public.sedes(id) on delete cascade,
  importacion_id uuid references public.inventario_joyas_importaciones(id) on delete set null,
  codigo text not null,
  nombre text not null,
  metal text not null default '',
  ley text not null default '',
  peso numeric,
  talla text not null default '',
  piedras text not null default '',
  cantidad numeric not null default 1,
  estado text not null default 'disponible',
  origen text not null default 'app',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventario_joyas_estado_chk check (estado in ('disponible','reservada','vendida','en_produccion','apartada','otro')),
  constraint inventario_joyas_origen_chk check (origen in ('app','excel')),
  constraint inventario_joyas_cantidad_chk check (cantidad >= 0),
  constraint inventario_joyas_codigo_sede_uk unique (sede_id, codigo)
);

create index if not exists inventario_joyas_sede_idx on public.inventario_joyas(sede_id);
create index if not exists inventario_joyas_estado_idx on public.inventario_joyas(sede_id, estado);
create index if not exists inventario_joyas_importacion_idx on public.inventario_joyas(importacion_id);

alter table public.inventario_joyas_importaciones enable row level security;
alter table public.inventario_joyas enable row level security;

revoke all on table public.inventario_joyas_importaciones from anon;
revoke all on table public.inventario_joyas from anon;
grant select, insert, update, delete on table public.inventario_joyas_importaciones to authenticated;
grant select, insert, update, delete on table public.inventario_joyas to authenticated;

drop policy if exists "joyas_importaciones_select" on public.inventario_joyas_importaciones;
drop policy if exists "joyas_importaciones_manage" on public.inventario_joyas_importaciones;
drop policy if exists "joyas_select" on public.inventario_joyas;
drop policy if exists "joyas_manage" on public.inventario_joyas;

create policy "joyas_importaciones_select" on public.inventario_joyas_importaciones
for select to authenticated using ((select public.ve_sede((select auth.uid()), sede_id)));

create policy "joyas_importaciones_manage" on public.inventario_joyas_importaciones
for all to authenticated
using ((select public.es_admin((select auth.uid()))) and (select public.ve_sede((select auth.uid()), sede_id)))
with check ((select public.es_admin((select auth.uid()))) and (select public.ve_sede((select auth.uid()), sede_id)));

create policy "joyas_select" on public.inventario_joyas
for select to authenticated using ((select public.ve_sede((select auth.uid()), sede_id)));

create policy "joyas_manage" on public.inventario_joyas
for all to authenticated
using ((select public.es_admin((select auth.uid()))) and (select public.ve_sede((select auth.uid()), sede_id)))
with check ((select public.es_admin((select auth.uid()))) and (select public.ve_sede((select auth.uid()), sede_id)));

comment on table public.inventario_joyas is 'Stock de joyas terminadas, separado del inventario de insumos. Admite migracion progresiva desde Excel.';
comment on table public.inventario_joyas_importaciones is 'Lotes de importacion de stock de joyas desde Excel para conservar trazabilidad del origen.';