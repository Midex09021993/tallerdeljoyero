create sequence if not exists public.cotizaciones_numero_seq;

create table if not exists public.cotizaciones (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  version integer not null default 1 check (version > 0),
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  proyecto_joya_id uuid references public.proyectos_joya(id) on delete set null,
  sede_id uuid references public.sedes(id) on delete set null,
  estado text not null default 'borrador'
    check (estado in ('borrador','enviada','aprobada','rechazada','vencida','cancelada')),
  fecha_emision date not null default current_date,
  fecha_vencimiento date,
  moneda text not null default 'PEN' check (moneda in ('PEN','USD')),
  subtotal_costo numeric(14,2) not null default 0 check (subtotal_costo >= 0),
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  descuento numeric(14,2) not null default 0 check (descuento >= 0),
  impuestos numeric(14,2) not null default 0 check (impuestos >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  anticipo numeric(14,2) not null default 0 check (anticipo >= 0),
  notas_cliente text not null default '',
  notas_internas text not null default '',
  identidad_comercial jsonb not null default '{}'::jsonb,
  reemplaza_id uuid references public.cotizaciones(id) on delete set null,
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (numero, version),
  check (fecha_vencimiento is null or fecha_vencimiento >= fecha_emision),
  check (anticipo <= total)
);

create table if not exists public.cotizacion_detalles (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid not null references public.cotizaciones(id) on delete cascade,
  orden integer not null default 1 check (orden > 0),
  tipo text not null default 'otro'
    check (tipo in ('modelo','metal','piedras','fundicion','engaste','acabado','mano_obra','render','otro')),
  descripcion text not null,
  cantidad numeric(14,3) not null default 1 check (cantidad > 0),
  unidad text not null default 'und',
  costo_unitario numeric(14,2) not null default 0 check (costo_unitario >= 0),
  precio_unitario numeric(14,2) not null default 0 check (precio_unitario >= 0),
  total_costo numeric(14,2) not null default 0 check (total_costo >= 0),
  total_precio numeric(14,2) not null default 0 check (total_precio >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cotizaciones_cliente_id_idx on public.cotizaciones(cliente_id);
create index if not exists cotizaciones_proyecto_joya_id_idx on public.cotizaciones(proyecto_joya_id);
create index if not exists cotizaciones_sede_id_idx on public.cotizaciones(sede_id);
create index if not exists cotizaciones_estado_idx on public.cotizaciones(estado);
create index if not exists cotizaciones_created_at_idx on public.cotizaciones(created_at desc);
create index if not exists cotizaciones_reemplaza_id_idx on public.cotizaciones(reemplaza_id);
create index if not exists cotizacion_detalles_cotizacion_id_idx on public.cotizacion_detalles(cotizacion_id);

create or replace function public.generar_numero_cotizacion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.numero is null or btrim(new.numero) = '' then
    new.numero := 'COT-' || to_char(current_date, 'YYYY') || '-' ||
      lpad(nextval('public.cotizaciones_numero_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists cotizaciones_generar_numero on public.cotizaciones;
create trigger cotizaciones_generar_numero
before insert on public.cotizaciones
for each row execute function public.generar_numero_cotizacion();

drop trigger if exists cotizacion_detalles_set_updated_at on public.cotizacion_detalles;
create trigger cotizacion_detalles_set_updated_at before update on public.cotizacion_detalles
for each row execute function public.set_updated_at();

drop trigger if exists cotizaciones_set_updated_at on public.cotizaciones;
create trigger cotizaciones_set_updated_at before update on public.cotizaciones
for each row execute function public.set_updated_at();

alter table public.cotizaciones enable row level security;
alter table public.cotizacion_detalles enable row level security;

drop policy if exists "cotizaciones ver" on public.cotizaciones;
drop policy if exists "cotizaciones gestionar" on public.cotizaciones;
drop policy if exists "cotizacion_detalles ver" on public.cotizacion_detalles;
drop policy if exists "cotizacion_detalles gestionar" on public.cotizacion_detalles;

create policy "cotizaciones ver" on public.cotizaciones
for select to authenticated
using (
  (select public.has_role((select auth.uid()), 'dueno'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gerente'::public.app_role))
  or sede_id = (select public.mi_sede((select auth.uid())))
);

create policy "cotizaciones gestionar" on public.cotizaciones
for all to authenticated
using (
  (select public.has_role((select auth.uid()), 'dueno'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gerente'::public.app_role))
)
with check (
  (select public.has_role((select auth.uid()), 'dueno'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gerente'::public.app_role))
);

create policy "cotizacion_detalles ver" on public.cotizacion_detalles
for select to authenticated
using (
  exists (
    select 1 from public.cotizaciones c
    where c.id = cotizacion_id
      and (
        (select public.has_role((select auth.uid()), 'dueno'::public.app_role))
        or (select public.has_role((select auth.uid()), 'gerente'::public.app_role))
        or c.sede_id = (select public.mi_sede((select auth.uid())))
      )
  )
);

create policy "cotizacion_detalles gestionar" on public.cotizacion_detalles
for all to authenticated
using (
  exists (
    select 1 from public.cotizaciones c
    where c.id = cotizacion_id
      and (
        (select public.has_role((select auth.uid()), 'dueno'::public.app_role))
        or (select public.has_role((select auth.uid()), 'gerente'::public.app_role))
      )
  )
)
with check (
  exists (
    select 1 from public.cotizaciones c
    where c.id = cotizacion_id
      and (
        (select public.has_role((select auth.uid()), 'dueno'::public.app_role))
        or (select public.has_role((select auth.uid()), 'gerente'::public.app_role))
      )
  )
);

comment on table public.cotizaciones is 'Cotizaciones comerciales con historial de versiones y separación entre costo interno y precio al cliente.';
comment on column public.cotizaciones.identidad_comercial is 'Snapshot de identidad del taller al emitir la cotización: logo, nombre, contacto y datos comerciales.';
comment on column public.cotizacion_detalles.costo_unitario is 'Costo interno. Nunca debe exponerse en documentos comerciales al cliente.';
comment on column public.cotizacion_detalles.precio_unitario is 'Precio unitario presentado al cliente.';