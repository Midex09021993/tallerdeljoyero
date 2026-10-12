-- Tienda de insumos para joyería, separada del catálogo de joyas.
-- Modelo multitienda: cada registro pertenece a un participante.
begin;

create table if not exists public.tiendas_insumos (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null unique references public.ecosistema_participantes(id) on delete cascade,
  slug text not null unique,
  nombre_publico text not null,
  descripcion text,
  whatsapp text,
  moneda text not null default 'PEN',
  visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tiendas_insumos_slug_chk check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table if not exists public.tienda_insumos_productos (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas_insumos(id) on delete cascade,
  codigo text,
  nombre text not null,
  slug text not null,
  categoria text not null default 'Otros',
  descripcion text,
  imagen_url text,
  precio numeric(12,2),
  moneda text not null default 'PEN',
  stock numeric(12,3),
  unidad text not null default 'unidad',
  publicado boolean not null default false,
  destacado boolean not null default false,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tienda_insumos_productos_precio_chk check (precio is null or precio >= 0),
  constraint tienda_insumos_productos_stock_chk check (stock is null or stock >= 0),
  constraint tienda_insumos_productos_slug_uq unique (tienda_id, slug)
);

create index if not exists tienda_insumos_productos_publicados_idx
  on public.tienda_insumos_productos (tienda_id, publicado, destacado desc, orden);

alter table public.tiendas_insumos enable row level security;
alter table public.tienda_insumos_productos enable row level security;

drop policy if exists "tiendas_insumos_publicas_visibles" on public.tiendas_insumos;
create policy "tiendas_insumos_publicas_visibles"
  on public.tiendas_insumos for select to anon, authenticated
  using (visible = true);

drop policy if exists "tiendas_insumos_participante_select" on public.tiendas_insumos;
create policy "tiendas_insumos_participante_select"
  on public.tiendas_insumos for select to authenticated
  using (public.tiene_participante((select auth.uid()), participante_id));

drop policy if exists "tiendas_insumos_admin_write" on public.tiendas_insumos;
create policy "tiendas_insumos_admin_write"
  on public.tiendas_insumos for all to authenticated
  using (
    public.es_admin((select auth.uid()))
    and public.tiene_participante((select auth.uid()), participante_id)
    and exists (
      select 1 from public.ecosistema_participantes ep
      where ep.id = participante_id and upper(ep.nombre) like '%FADILAB%'
    )
  )
  with check (
    public.es_admin((select auth.uid()))
    and public.tiene_participante((select auth.uid()), participante_id)
    and exists (
      select 1 from public.ecosistema_participantes ep
      where ep.id = participante_id and upper(ep.nombre) like '%FADILAB%'
    )
  );

drop policy if exists "tienda_insumos_productos_publicos" on public.tienda_insumos_productos;
create policy "tienda_insumos_productos_publicos"
  on public.tienda_insumos_productos for select to anon, authenticated
  using (publicado = true and exists (
    select 1 from public.tiendas_insumos t where t.id = tienda_id and t.visible = true
  ));

drop policy if exists "tienda_insumos_productos_participante_select" on public.tienda_insumos_productos;
create policy "tienda_insumos_productos_participante_select"
  on public.tienda_insumos_productos for select to authenticated
  using (exists (
    select 1 from public.tiendas_insumos t
    where t.id = tienda_id and public.tiene_participante((select auth.uid()), t.participante_id)
  ));

drop policy if exists "tienda_insumos_productos_admin_write" on public.tienda_insumos_productos;
create policy "tienda_insumos_productos_admin_write"
  on public.tienda_insumos_productos for all to authenticated
  using (exists (
    select 1 from public.tiendas_insumos t
    where t.id = tienda_id
      and public.es_admin((select auth.uid()))
      and public.tiene_participante((select auth.uid()), t.participante_id)
      and exists (
        select 1 from public.ecosistema_participantes ep
        where ep.id = t.participante_id and upper(ep.nombre) like '%FADILAB%'
      )
  ))
  with check (exists (
    select 1 from public.tiendas_insumos t
    where t.id = tienda_id
      and public.es_admin((select auth.uid()))
      and public.tiene_participante((select auth.uid()), t.participante_id)
      and exists (
        select 1 from public.ecosistema_participantes ep
        where ep.id = t.participante_id and upper(ep.nombre) like '%FADILAB%'
      )
  ));

grant select on public.tiendas_insumos, public.tienda_insumos_productos to anon, authenticated;
grant insert, update, delete on public.tiendas_insumos, public.tienda_insumos_productos to authenticated;

commit;
