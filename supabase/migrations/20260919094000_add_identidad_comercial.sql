create table if not exists public.identidades_comerciales (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid references public.sedes(id) on delete set null,
  nombre_comercial text not null,
  razon_social text,
  ruc text,
  logo_url text,
  email text,
  telefono text,
  whatsapp text,
  direccion text,
  ciudad text,
  sitio_web text,
  color_principal text,
  pie_documento text,
  metadata jsonb not null default '{}'::jsonb,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists identidades_comerciales_sede_id_idx on public.identidades_comerciales(sede_id);
create index if not exists identidades_comerciales_activa_idx on public.identidades_comerciales(activa);
alter table public.identidades_comerciales enable row level security;
drop policy if exists "identidades comerciales ver" on public.identidades_comerciales;
drop policy if exists "identidades comerciales gestionar" on public.identidades_comerciales;
create policy "identidades comerciales ver" on public.identidades_comerciales
for select to authenticated using (
  (select public.has_role((select auth.uid()), 'dueno'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gerente'::public.app_role))
  or sede_id = (select public.mi_sede((select auth.uid())))
);
create policy "identidades comerciales gestionar" on public.identidades_comerciales
for all to authenticated using (
  (select public.has_role((select auth.uid()), 'dueno'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gerente'::public.app_role))
) with check (
  (select public.has_role((select auth.uid()), 'dueno'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gerente'::public.app_role))
);
drop trigger if exists identidades_comerciales_set_updated_at on public.identidades_comerciales;
create trigger identidades_comerciales_set_updated_at before update on public.identidades_comerciales for each row execute function public.set_updated_at();
alter table public.cotizaciones add column if not exists identidad_comercial_id uuid references public.identidades_comerciales(id) on delete set null;
create index if not exists cotizaciones_identidad_comercial_id_idx on public.cotizaciones(identidad_comercial_id);