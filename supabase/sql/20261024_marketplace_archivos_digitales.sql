-- Marketplace de archivos digitales de Taller del Joyero.
-- Ejecutar manualmente en el SQL Editor de Lovable Cloud.
-- No modifica tablas del catálogo de joyas ni el motor Aurum Render.

begin;

create table if not exists public.archivos_digitales_marketplace (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.ecosistema_participantes(id) on delete restrict,
  vendedor_usuario_id uuid not null references auth.users(id) on delete restrict,
  titulo text not null check (length(trim(titulo)) between 3 and 140),
  descripcion text not null default '' check (length(descripcion) <= 5000),
  categoria text not null default 'Modelos 3D'
    check (categoria in ('Anillos','Pendientes','Collares','Dijes','Pulseras','Modelos 3D','Planos técnicos','Imágenes','Otros')),
  formatos text[] not null default '{}'
    check (cardinality(formatos) > 0 and formatos <@ array['STL','3DM','GLB','OBJ','STEP','IMAGEN','PDF','PLANO']::text[]),
  precio numeric(12,2) not null check (precio > 0),
  moneda text not null default 'PEN' check (moneda in ('PEN','USD')),
  imagen_portada_url text,
  bucket_archivo text not null default 'mi-nube' check (bucket_archivo = 'mi-nube'),
  ruta_archivo text not null check (length(ruta_archivo) between 1 and 1024 and ruta_archivo !~ '(^/|(^|/)\.\.(/|$)|\\)'),
  nombre_archivo text not null check (length(trim(nombre_archivo)) between 1 and 255),
  bytes_archivo bigint check (bytes_archivo is null or bytes_archivo >= 0),
  estado text not null default 'borrador' check (estado in ('borrador','publicado','pausado','retirado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint archivos_digitales_ruta_pertenece_vendedor check (ruta_archivo like participante_id::text || '/' || vendedor_usuario_id::text || '/%'),
  constraint archivos_digitales_vendedor_ruta_uq unique (vendedor_usuario_id, ruta_archivo)
);

create index if not exists archivos_digitales_publicados_idx
  on public.archivos_digitales_marketplace (estado, created_at desc);
create index if not exists archivos_digitales_vendedor_idx
  on public.archivos_digitales_marketplace (vendedor_usuario_id, updated_at desc);

alter table public.archivos_digitales_marketplace enable row level security;
revoke all on public.archivos_digitales_marketplace from anon, authenticated;
grant select, insert, update, delete on public.archivos_digitales_marketplace to authenticated;

drop policy if exists "archivos digitales leer propios" on public.archivos_digitales_marketplace;
create policy "archivos digitales leer propios"
on public.archivos_digitales_marketplace for select to authenticated
using (
  vendedor_usuario_id = (select auth.uid())
  and exists (
    select 1 from public.participante_cuentas pc
    where pc.user_id = (select auth.uid())
      and pc.participante_id = archivos_digitales_marketplace.participante_id
      and pc.estado = 'activo'
  )
);

drop policy if exists "archivos digitales crear propios" on public.archivos_digitales_marketplace;
create policy "archivos digitales crear propios"
on public.archivos_digitales_marketplace for insert to authenticated
with check (
  vendedor_usuario_id = (select auth.uid())
  and exists (
    select 1 from public.participante_cuentas pc
    where pc.user_id = (select auth.uid())
      and pc.participante_id = archivos_digitales_marketplace.participante_id
      and pc.estado = 'activo'
  )
);

drop policy if exists "archivos digitales actualizar propios" on public.archivos_digitales_marketplace;
create policy "archivos digitales actualizar propios"
on public.archivos_digitales_marketplace for update to authenticated
using (
  vendedor_usuario_id = (select auth.uid())
  and exists (
    select 1 from public.participante_cuentas pc
    where pc.user_id = (select auth.uid())
      and pc.participante_id = archivos_digitales_marketplace.participante_id
      and pc.estado = 'activo'
  )
)
with check (
  vendedor_usuario_id = (select auth.uid())
  and exists (
    select 1 from public.participante_cuentas pc
    where pc.user_id = (select auth.uid())
      and pc.participante_id = archivos_digitales_marketplace.participante_id
      and pc.estado = 'activo'
  )
);

drop policy if exists "archivos digitales eliminar propios" on public.archivos_digitales_marketplace;
create policy "archivos digitales eliminar propios"
on public.archivos_digitales_marketplace for delete to authenticated
using (
  vendedor_usuario_id = (select auth.uid())
  and estado = 'borrador'
  and exists (
    select 1 from public.participante_cuentas pc
    where pc.user_id = (select auth.uid())
      and pc.participante_id = archivos_digitales_marketplace.participante_id
      and pc.estado = 'activo'
  )
);

create table if not exists public.compras_archivos_digitales (
  id uuid primary key default gen_random_uuid(),
  archivo_id uuid not null references public.archivos_digitales_marketplace(id) on delete restrict,
  comprador_usuario_id uuid not null references auth.users(id) on delete restrict,
  vendedor_usuario_id uuid not null references auth.users(id) on delete restrict,
  precio_pagado numeric(12,2) not null check (precio_pagado > 0),
  moneda text not null check (moneda in ('PEN','USD')),
  estado_pago text not null default 'pendiente'
    check (estado_pago in ('pendiente','pagado','fallido','reembolsado','disputado')),
  proveedor_pago text,
  referencia_pago text,
  pagado_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists compras_archivos_referencia_pago_uq
  on public.compras_archivos_digitales (proveedor_pago, referencia_pago)
  where referencia_pago is not null;
create index if not exists compras_archivos_comprador_idx
  on public.compras_archivos_digitales (comprador_usuario_id, created_at desc);
create index if not exists compras_archivos_archivo_idx
  on public.compras_archivos_digitales (archivo_id, estado_pago);

alter table public.compras_archivos_digitales enable row level security;
revoke all on public.compras_archivos_digitales from anon, authenticated;
grant select on public.compras_archivos_digitales to authenticated;

drop policy if exists "comprador ver sus compras de archivos" on public.compras_archivos_digitales;
create policy "comprador ver sus compras de archivos"
on public.compras_archivos_digitales for select to authenticated
using (comprador_usuario_id = (select auth.uid()));

create or replace function public.obtener_marketplace_archivos_publico()
returns table (
  archivo_id uuid,
  titulo text,
  descripcion text,
  categoria text,
  formatos text[],
  precio numeric,
  moneda text,
  imagen_portada_url text,
  nombre_vendedor text,
  creado_en timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    a.titulo,
    a.descripcion,
    a.categoria,
    a.formatos,
    a.precio,
    a.moneda,
    a.imagen_portada_url,
    ep.nombre,
    a.created_at
  from public.archivos_digitales_marketplace a
  join public.ecosistema_participantes ep on ep.id = a.participante_id
  where a.estado = 'publicado'
    and ep.estado = 'activo'
  order by a.created_at desc;
$$;

revoke all on function public.obtener_marketplace_archivos_publico() from public;
grant execute on function public.obtener_marketplace_archivos_publico() to anon, authenticated;

comment on table public.archivos_digitales_marketplace is
  'Publicaciones vendibles de archivos digitales. La ruta del original permanece privada y nunca se devuelve por la función pública.';
comment on table public.compras_archivos_digitales is
  'Registro de compras digitales. Solo un backend de pago confiable debe cambiar estado_pago a pagado.';


create or replace function public.obtener_mis_compras_archivos()
returns table (
  compra_id uuid,
  archivo_id uuid,
  titulo text,
  nombre_archivo text,
  formatos text[],
  precio_pagado numeric,
  moneda text,
  estado_pago text,
  creado_en timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.archivo_id,
    a.titulo,
    a.nombre_archivo,
    a.formatos,
    c.precio_pagado,
    c.moneda,
    c.estado_pago,
    c.created_at
  from public.compras_archivos_digitales c
  join public.archivos_digitales_marketplace a on a.id = c.archivo_id
  where c.comprador_usuario_id = (select auth.uid())
  order by c.created_at desc;
$$;

revoke all on function public.obtener_mis_compras_archivos() from public;
grant execute on function public.obtener_mis_compras_archivos() to authenticated;

notify pgrst, 'reload schema';
commit;

-- Verificación posterior:
select archivo_id, titulo, formatos, precio, moneda, nombre_vendedor
from public.obtener_marketplace_archivos_publico()
limit 20;
