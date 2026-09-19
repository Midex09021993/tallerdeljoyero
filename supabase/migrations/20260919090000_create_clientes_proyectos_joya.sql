-- Capa comercial base: clientes y proyectos de joyería.
-- No modifica pedidos existentes. Se prepara la relación comercial para
-- Cotizaciones -> Pedidos sin romper el flujo operativo actual.

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  documento text,
  email text,
  telefono text,
  whatsapp text,
  ciudad text,
  direccion text,
  tipo text not null default 'persona'
    check (tipo in ('persona','empresa')),
  estado text not null default 'activo'
    check (estado in ('activo','inactivo')),
  notas text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  sede_id uuid references public.sedes(id) on delete set null,
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clientes_sede_id_idx on public.clientes(sede_id);
create index if not exists clientes_estado_idx on public.clientes(estado);
create index if not exists clientes_nombre_idx on public.clientes(lower(nombre));
create unique index if not exists clientes_documento_unique_idx
  on public.clientes(documento)
  where documento is not null and btrim(documento) <> '';

create table if not exists public.proyectos_joya (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  sede_id uuid references public.sedes(id) on delete set null,
  codigo text not null unique,
  nombre text not null,
  descripcion text not null default '',
  estado text not null default 'activo'
    check (estado in ('activo','pausado','cerrado','cancelado')),
  metal text,
  ley text,
  peso_estimado numeric,
  talla text,
  cantidad_piezas integer not null default 1 check (cantidad_piezas > 0),
  piedras text,
  especificaciones jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proyectos_joya_cliente_id_idx on public.proyectos_joya(cliente_id);
create index if not exists proyectos_joya_sede_id_idx on public.proyectos_joya(sede_id);
create index if not exists proyectos_joya_estado_idx on public.proyectos_joya(estado);
create index if not exists proyectos_joya_created_at_idx on public.proyectos_joya(created_at desc);

alter table public.clientes enable row level security;
alter table public.proyectos_joya enable row level security;

drop policy if exists "clientes ver" on public.clientes;
drop policy if exists "clientes gestionar" on public.clientes;
drop policy if exists "proyectos_joya ver" on public.proyectos_joya;
drop policy if exists "proyectos_joya gestionar" on public.proyectos_joya;

create policy "clientes ver" on public.clientes
for select to authenticated
using (
  (select public.has_role((select auth.uid()), 'dueno'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gerente'::public.app_role))
  or sede_id = (select public.mi_sede((select auth.uid())))
);

create policy "clientes gestionar" on public.clientes
for all to authenticated
using (
  (select public.has_role((select auth.uid()), 'dueno'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gerente'::public.app_role))
)
with check (
  (select public.has_role((select auth.uid()), 'dueno'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gerente'::public.app_role))
);

create policy "proyectos_joya ver" on public.proyectos_joya
for select to authenticated
using (
  (select public.has_role((select auth.uid()), 'dueno'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gerente'::public.app_role))
  or sede_id = (select public.mi_sede((select auth.uid())))
);

create policy "proyectos_joya gestionar" on public.proyectos_joya
for all to authenticated
using (
  (select public.has_role((select auth.uid()), 'dueno'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gerente'::public.app_role))
)
with check (
  (select public.has_role((select auth.uid()), 'dueno'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gerente'::public.app_role))
);

drop trigger if exists clientes_set_updated_at on public.clientes;
create trigger clientes_set_updated_at
before update on public.clientes
for each row execute function public.set_updated_at();

drop trigger if exists proyectos_joya_set_updated_at on public.proyectos_joya;
create trigger proyectos_joya_set_updated_at
before update on public.proyectos_joya
for each row execute function public.set_updated_at();

-- Compatibilidad: el pedido conserva sus datos actuales.
-- La vinculación estructurada con proyecto/cotización se añadirá en las
-- siguientes migraciones cuando exista el módulo de cotizaciones.
