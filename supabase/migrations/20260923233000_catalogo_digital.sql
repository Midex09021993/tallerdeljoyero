-- Catálogo digital: arquitectura base para catálogo interno y público.
create table if not exists public.catalogo_colecciones (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references public.sedes(id) on delete cascade,
  nombre text not null,
  slug text not null,
  descripcion text,
  portada_url text,
  estado text not null default 'borrador'
    check (estado in ('borrador','publicado','archivado')),
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sede_id, slug)
);

create table if not exists public.catalogo_productos (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references public.sedes(id) on delete cascade,
  codigo text not null,
  nombre text not null,
  slug text not null,
  categoria text not null default 'Sin categoría',
  descripcion text,
  imagen_principal_url text,
  galeria jsonb not null default '[]'::jsonb,
  video_url text,
  aurum_render_url text,
  precio_desde numeric(12,2),
  moneda text not null default 'PEN',
  publicado boolean not null default false,
  destacado boolean not null default false,
  orden integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sede_id, codigo),
  unique (sede_id, slug)
);

create table if not exists public.catalogo_productos_colecciones (
  producto_id uuid not null references public.catalogo_productos(id) on delete cascade,
  coleccion_id uuid not null references public.catalogo_colecciones(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (producto_id, coleccion_id)
);

create index if not exists catalogo_productos_sede_idx
  on public.catalogo_productos(sede_id);
create index if not exists catalogo_productos_publicado_idx
  on public.catalogo_productos(sede_id, publicado);
create index if not exists catalogo_colecciones_sede_idx
  on public.catalogo_colecciones(sede_id);

alter table public.catalogo_colecciones enable row level security;
alter table public.catalogo_productos enable row level security;
alter table public.catalogo_productos_colecciones enable row level security;

drop policy if exists "catalogo_colecciones_admin_select" on public.catalogo_colecciones;
create policy "catalogo_colecciones_admin_select"
on public.catalogo_colecciones
for select to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::app_role)
  or public.ve_sede((select auth.uid()), sede_id)
);

drop policy if exists "catalogo_colecciones_admin_write" on public.catalogo_colecciones;
create policy "catalogo_colecciones_admin_write"
on public.catalogo_colecciones
for all to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
)
with check (
  public.has_role((select auth.uid()), 'dueno'::app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
);

drop policy if exists "catalogo_productos_admin_select" on public.catalogo_productos;
create policy "catalogo_productos_admin_select"
on public.catalogo_productos
for select to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::app_role)
  or public.ve_sede((select auth.uid()), sede_id)
);

drop policy if exists "catalogo_productos_admin_write" on public.catalogo_productos;
create policy "catalogo_productos_admin_write"
on public.catalogo_productos
for all to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
)
with check (
  public.has_role((select auth.uid()), 'dueno'::app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
);

drop policy if exists "catalogo_relaciones_admin" on public.catalogo_productos_colecciones;
create policy "catalogo_relaciones_admin"
on public.catalogo_productos_colecciones
for all to authenticated
using (
  exists (
    select 1 from public.catalogo_productos p
    where p.id = producto_id
      and (
        public.has_role((select auth.uid()), 'dueno'::app_role)
        or public.ve_sede((select auth.uid()), p.sede_id)
      )
  )
)
with check (
  exists (
    select 1 from public.catalogo_productos p
    where p.id = producto_id
      and (
        public.has_role((select auth.uid()), 'dueno'::app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::app_role)
          and public.ve_sede((select auth.uid()), p.sede_id)
        )
      )
  )
);

grant select, insert, update, delete on public.catalogo_colecciones to authenticated;
grant select, insert, update, delete on public.catalogo_productos to authenticated;
grant select, insert, update, delete on public.catalogo_productos_colecciones to authenticated;

create table if not exists public.catalogo_configuracion (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null unique references public.sedes(id) on delete cascade,
  slug text not null unique,
  nombre_publico text not null,
  descripcion_publica text,
  logo_url text,
  portada_url text,
  whatsapp text,
  instagram_url text,
  visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.catalogo_configuracion enable row level security;

drop policy if exists "catalogo_config_admin" on public.catalogo_configuracion;
create policy "catalogo_config_admin"
on public.catalogo_configuracion
for all to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
)
with check (
  public.has_role((select auth.uid()), 'dueno'::app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
);

grant select, insert, update, delete on public.catalogo_configuracion to authenticated;

create or replace function public.obtener_catalogo_publico(_slug text)
returns table (
  sede_id uuid,
  slug text,
  nombre_publico text,
  descripcion_publica text,
  logo_url text,
  portada_url text,
  whatsapp text,
  instagram_url text,
  producto_id uuid,
  codigo text,
  nombre text,
  categoria text,
  descripcion text,
  imagen_principal_url text,
  galeria jsonb,
  video_url text,
  aurum_render_url text,
  precio_desde numeric,
  moneda text,
  destacado boolean
)
language sql
security definer
set search_path = ''
as $$
  select
    c.sede_id,
    c.slug,
    c.nombre_publico,
    c.descripcion_publica,
    c.logo_url,
    c.portada_url,
    c.whatsapp,
    c.instagram_url,
    p.id,
    p.codigo,
    p.nombre,
    p.categoria,
    p.descripcion,
    p.imagen_principal_url,
    p.galeria,
    p.video_url,
    p.aurum_render_url,
    p.precio_desde,
    p.moneda,
    p.destacado
  from public.catalogo_configuracion c
  join public.catalogo_productos p
    on p.sede_id = c.sede_id
  where c.slug = _slug
    and c.visible = true
    and p.publicado = true
  order by p.destacado desc, p.orden, p.nombre;
$$;

revoke all on function public.obtener_catalogo_publico(text) from public, anon;
grant execute on function public.obtener_catalogo_publico(text) to anon, authenticated;
