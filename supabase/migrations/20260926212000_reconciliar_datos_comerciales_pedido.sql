-- Reconciliación comercial para Lovable Cloud.
-- La instancia administrada por Lovable puede tener un historial de migraciones
-- diferente al árbol histórico del repositorio. Esta migración deja el esquema
-- mínimo requerido por las funciones comerciales actuales sin tocar datos
-- directamente desde el cliente.
--
-- Fuente canónica del resumen económico del pedido:
--   public.pedido_comercial
--
-- No registra pagos ni altera contratos existentes.

alter table public.pedidos
  add column if not exists proyecto_joya_id uuid references public.proyectos_joya(id) on delete set null,
  add column if not exists cotizacion_detalles jsonb not null default '[]'::jsonb,
  add column if not exists especificaciones_comerciales jsonb not null default '{}'::jsonb;

create index if not exists pedidos_proyecto_joya_id_idx
  on public.pedidos(proyecto_joya_id);

alter table public.cotizaciones
  add column if not exists fecha_entrega_solicitada date;

create table if not exists public.pedido_comercial (
  pedido_id uuid primary key references public.pedidos(id) on delete cascade,
  telefono text not null default '',
  importe numeric not null default 0,
  a_cuenta numeric not null default 0,
  saldo numeric not null default 0,
  cotizacion_detalles jsonb not null default '[]'::jsonb,
  especificaciones_comerciales jsonb not null default '{}'::jsonb,
  ventas_estado text not null default 'pendiente',
  packing_estado text not null default 'pendiente',
  medio_envio text not null default '',
  guia_envio text not null default '',
  fecha_envio date,
  fecha_entregado date,
  receptor_envio text not null default '',
  notas_ventas text not null default '',
  fecha_listo_entrega timestamptz,
  listo_entrega_observaciones text,
  notas_envio text,
  notas_entrega text,
  usuario_listo_entrega text,
  usuario_envio text,
  usuario_entrega text,
  ventas_actualizado_por text,
  ventas_actualizado_en timestamptz,
  enviado_at timestamptz,
  entregado_at timestamptz
);

-- Si la tabla existía de una versión parcial, completamos únicamente
-- las columnas que la versión canónica necesita.
alter table public.pedido_comercial
  add column if not exists telefono text not null default '',
  add column if not exists importe numeric not null default 0,
  add column if not exists a_cuenta numeric not null default 0,
  add column if not exists saldo numeric not null default 0,
  add column if not exists cotizacion_detalles jsonb not null default '[]'::jsonb,
  add column if not exists especificaciones_comerciales jsonb not null default '{}':jsonb;

-- Corrige el literal JSON por compatibilidad si el esquema ya existía.
alter table public.pedido_comercial
  alter column cotizacion_detalles set default '[]'::jsonb,
  alter column especificaciones_comerciales set default '{}'::jsonb;

alter table public.pedido_comercial enable row level security;

revoke all on public.pedido_comercial from anon;
grant select, insert, update, delete on public.pedido_comercial to authenticated;

drop policy if exists "pedido_comercial select" on public.pedido_comercial;
drop policy if exists "pedido_comercial insert" on public.pedido_comercial;
drop policy if exists "pedido_comercial update" on public.pedido_comercial;
drop policy if exists "pedido_comercial delete" on public.pedido_comercial;

create policy "pedido_comercial select"
on public.pedido_comercial
for select
to authenticated
using (
  exists (
    select 1
    from public.pedidos p
    where p.id = pedido_comercial.pedido_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and p.sede_id = public.mi_sede((select auth.uid()))
        )
      )
  )
);

create policy "pedido_comercial insert"
on public.pedido_comercial
for insert
to authenticated
with check (
  exists (
    select 1
    from public.pedidos p
    where p.id = pedido_comercial.pedido_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and p.sede_id = public.mi_sede((select auth.uid()))
        )
      )
  )
);

create policy "pedido_comercial update"
on public.pedido_comercial
for update
to authenticated
using (
  exists (
    select 1
    from public.pedidos p
    where p.id = pedido_comercial.pedido_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and p.sede_id = public.mi_sede((select auth.uid()))
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.pedidos p
    where p.id = pedido_comercial.pedido_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and p.sede_id = public.mi_sede((select auth.uid()))
        )
      )
  )
);

create policy "pedido_comercial delete"
on public.pedido_comercial
for delete
to authenticated
using (
  exists (
    select 1
    from public.pedidos p
    where p.id = pedido_comercial.pedido_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and p.sede_id = public.mi_sede((select auth.uid()))
        )
      )
  )
);

-- Backfill seguro: toma los datos comerciales que ya existen en pedidos.
-- No inventa importes ni registra pagos.
insert into public.pedido_comercial (
  pedido_id,
  telefono,
  importe,
  a_cuenta,
  saldo,
  cotizacion_detalles,
  especificaciones_comerciales
)
select
  p.id,
  coalesce(p.telefono, ''),
  coalesce(p.importe, 0),
  coalesce(p.a_cuenta, 0),
  greatest(coalesce(p.importe, 0) - coalesce(p.a_cuenta, 0), 0),
  coalesce(p.cotizacion_detalles, '[]'::jsonb),
  coalesce(p.especificaciones_comerciales, '{}'::jsonb)
from public.pedidos p
on conflict (pedido_id) do update set
  telefono = excluded.telefono,
  importe = excluded.importe,
  a_cuenta = excluded.a_cuenta,
  saldo = excluded.saldo,
  cotizacion_detalles = excluded.cotizacion_detalles,
  especificaciones_comerciales = excluded.especificaciones_comerciales;

comment on table public.pedido_comercial is
  'Fuente canónica de datos comerciales y resumen económico del pedido. Lovable Cloud aplica esta migración; el cliente no modifica el esquema directamente.';
