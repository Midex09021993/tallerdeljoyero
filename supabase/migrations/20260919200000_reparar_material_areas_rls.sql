create table if not exists public.material_areas (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.inventario(id) on delete cascade,
  area text not null,
  created_at timestamptz not null default now(),
  unique (material_id, area)
);

grant select, insert, update, delete on table public.material_areas to authenticated;
revoke all on table public.material_areas from anon;

alter table public.material_areas enable row level security;

drop policy if exists "material areas por sede" on public.material_areas;
drop policy if exists "material areas leer por sede" on public.material_areas;
drop policy if exists "material areas gestionar admin" on public.material_areas;

create policy "material areas leer por sede"
on public.material_areas for select to authenticated
using (
  exists (
    select 1 from public.inventario m
    where m.id = material_areas.material_id
      and public.ve_sede((select auth.uid()), m.sede_id)
  )
);

create policy "material areas gestionar admin"
on public.material_areas for all to authenticated
using (
  public.es_admin((select auth.uid()))
  and exists (
    select 1 from public.inventario m
    where m.id = material_areas.material_id
      and public.ve_sede((select auth.uid()), m.sede_id)
  )
)
with check (
  public.es_admin((select auth.uid()))
  and exists (
    select 1 from public.inventario m
    where m.id = material_areas.material_id
      and public.ve_sede((select auth.uid()), m.sede_id)
  )
);