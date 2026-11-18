-- Reinicio completo del inventario: elimina exclusivamente la infraestructura del módulo
-- y la reconstruye con un modelo limpio, trazable y multi-sede.

drop function if exists public.aplicar_movimiento_inventario() cascade;

drop table if exists public.inventario_joyas cascade;
drop table if exists public.inventario_joyas_importaciones cascade;
drop table if exists public.material_areas cascade;
drop table if exists public.inventario_movimientos cascade;
drop table if exists public.inventario cascade;

create table public.inventario (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid references public.sedes(id) on delete restrict,
  codigo text not null default '',
  material text not null,
  categoria text not null default 'Otros insumos',
  unidad text not null default 'g',
  stock numeric(14,3) not null default 0 check (stock >= 0),
  minimo numeric(14,3) not null default 0 check (minimo >= 0),
  lote text not null default '',
  ubicacion text not null default '',
  proveedor text not null default '',
  costo_unitario numeric(14,4) not null default 0 check (costo_unitario >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index inventario_sede_codigo_uidx
  on public.inventario(sede_id, lower(trim(codigo)))
  where trim(codigo) <> '';

create index inventario_sede_activo_idx on public.inventario(sede_id, activo);
create index inventario_categoria_idx on public.inventario(categoria);
create index inventario_stock_idx on public.inventario(stock, minimo);

create table public.material_areas (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.inventario(id) on delete cascade,
  area text not null,
  created_at timestamptz not null default now(),
  unique(material_id, area)
);

create index material_areas_material_idx on public.material_areas(material_id);

create table public.inventario_movimientos (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.inventario(id) on delete restrict,
  pedido_id uuid references public.pedidos(id) on delete set null,
  usuario_id uuid references auth.users(id) on delete set null,
  tipo text not null check (tipo in ('entrada','consumo','devolucion','merma','ajuste_positivo','ajuste_negativo')),
  cantidad numeric(14,3) not null check (cantidad > 0),
  stock_anterior numeric(14,3),
  stock_posterior numeric(14,3),
  motivo text not null default '',
  referencia_externa text not null default '',
  created_at timestamptz not null default now()
);

create index inventario_mov_material_created_idx on public.inventario_movimientos(material_id, created_at desc);
create index inventario_mov_pedido_idx on public.inventario_movimientos(pedido_id);

create table public.inventario_joyas_importaciones (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references public.sedes(id) on delete restrict,
  nombre_archivo text not null,
  filas_detectadas integer not null default 0 check (filas_detectadas >= 0),
  filas_importadas integer not null default 0 check (filas_importadas >= 0),
  filas_con_revision integer not null default 0 check (filas_con_revision >= 0),
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.inventario_joyas (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references public.sedes(id) on delete restrict,
  importacion_id uuid references public.inventario_joyas_importaciones(id) on delete set null,
  codigo text not null,
  nombre text not null,
  metal text not null default '',
  ley text not null default '',
  peso numeric(14,3) check (peso is null or peso >= 0),
  talla text not null default '',
  piedras text not null default '',
  cantidad numeric(14,3) not null default 1 check (cantidad >= 0),
  estado text not null default 'disponible'
    check (estado in ('disponible','reservada','vendida','en_produccion','apartada','otro')),
  origen text not null default 'app'
    check (origen in ('app','excel')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index inventario_joyas_sede_codigo_uidx on public.inventario_joyas(sede_id, lower(trim(codigo)));
create index inventario_joyas_sede_estado_idx on public.inventario_joyas(sede_id, estado);

create or replace function public.actualizar_inventario_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger inventario_updated_at before update on public.inventario
for each row execute function public.actualizar_inventario_updated_at();

create trigger inventario_joyas_updated_at before update on public.inventario_joyas
for each row execute function public.actualizar_inventario_updated_at();

create or replace function public.aplicar_movimiento_inventario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stock numeric;
  v_delta numeric;
  v_nuevo numeric;
begin
  select i.stock into v_stock
  from public.inventario i
  where i.id = new.material_id
  for update;

  if not found then raise exception 'Material de inventario no encontrado'; end if;
  if new.cantidad is null or new.cantidad <= 0 then raise exception 'La cantidad debe ser mayor que cero'; end if;

  v_delta := case
    when new.tipo in ('entrada','devolucion','ajuste_positivo') then abs(new.cantidad)
    when new.tipo in ('consumo','merma','ajuste_negativo') then -abs(new.cantidad)
  end;
  v_nuevo := v_stock + v_delta;

  if v_nuevo < 0 then
    raise exception 'Stock insuficiente. Disponible: %, solicitado: %', v_stock, abs(new.cantidad);
  end if;

  new.cantidad := abs(new.cantidad);
  new.stock_anterior := v_stock;
  new.stock_posterior := v_nuevo;
  new.usuario_id := coalesce(new.usuario_id, auth.uid());

  update public.inventario
  set stock = v_nuevo, updated_at = now()
  where id = new.material_id;

  return new;
end;
$$;

create trigger inventario_movimiento_aplica
before insert on public.inventario_movimientos
for each row execute function public.aplicar_movimiento_inventario();

revoke all on function public.aplicar_movimiento_inventario() from public, anon, authenticated;
revoke all on function public.actualizar_inventario_updated_at() from public, anon, authenticated;

alter table public.inventario enable row level security;
alter table public.material_areas enable row level security;
alter table public.inventario_movimientos enable row level security;
alter table public.inventario_joyas enable row level security;
alter table public.inventario_joyas_importaciones enable row level security;

create policy "inventario leer sede" on public.inventario for select to authenticated
using (ve_sede(auth.uid(), sede_id));

create policy "inventario crear admin" on public.inventario for insert to authenticated
with check (es_admin(auth.uid()) and ve_sede(auth.uid(), sede_id));

create policy "inventario actualizar admin" on public.inventario for update to authenticated
using (es_admin(auth.uid()) and ve_sede(auth.uid(), sede_id))
with check (es_admin(auth.uid()) and ve_sede(auth.uid(), sede_id));

create policy "inventario borrar admin" on public.inventario for delete to authenticated
using (es_admin(auth.uid()) and ve_sede(auth.uid(), sede_id));

create policy "material areas leer por sede" on public.material_areas for select to authenticated
using (exists (select 1 from public.inventario m where m.id = material_areas.material_id and ve_sede(auth.uid(), m.sede_id)));

create policy "material areas gestionar admin" on public.material_areas for all to authenticated
using (es_admin(auth.uid()) and exists (select 1 from public.inventario m where m.id = material_areas.material_id and ve_sede(auth.uid(), m.sede_id)))
with check (es_admin(auth.uid()) and exists (select 1 from public.inventario m where m.id = material_areas.material_id and ve_sede(auth.uid(), m.sede_id)));

create policy "mov inventario leer sede" on public.inventario_movimientos for select to authenticated
using (exists (select 1 from public.inventario i where i.id = inventario_movimientos.material_id and ve_sede(auth.uid(), i.sede_id)));

create policy "mov inventario crear operativo" on public.inventario_movimientos for insert to authenticated
with check (
  exists (select 1 from public.inventario i where i.id = inventario_movimientos.material_id and ve_sede(auth.uid(), i.sede_id))
  and (es_admin(auth.uid()) or has_role(auth.uid(), 'operario'::app_role) or has_role(auth.uid(), 'monitor'::app_role))
);

create policy "joyas_select" on public.inventario_joyas for select to authenticated using (ve_sede(auth.uid(), sede_id));
create policy "joyas_insert" on public.inventario_joyas for insert to authenticated with check (es_admin(auth.uid()) and ve_sede(auth.uid(), sede_id));
create policy "joyas_update" on public.inventario_joyas for update to authenticated using (es_admin(auth.uid()) and ve_sede(auth.uid(), sede_id)) with check (es_admin(auth.uid()) and ve_sede(auth.uid(), sede_id));
create policy "joyas_delete" on public.inventario_joyas for delete to authenticated using (es_admin(auth.uid()) and ve_sede(auth.uid(), sede_id));

create policy "joyas_importaciones_select" on public.inventario_joyas_importaciones for select to authenticated using (ve_sede(auth.uid(), sede_id));
create policy "joyas_importaciones_insert" on public.inventario_joyas_importaciones for insert to authenticated with check (es_admin(auth.uid()) and ve_sede(auth.uid(), sede_id));
create policy "joyas_importaciones_update" on public.inventario_joyas_importaciones for update to authenticated using (es_admin(auth.uid()) and ve_sede(auth.uid(), sede_id)) with check (es_admin(auth.uid()) and ve_sede(auth.uid(), sede_id));
create policy "joyas_importaciones_delete" on public.inventario_joyas_importaciones for delete to authenticated using (es_admin(auth.uid()) and ve_sede(auth.uid(), sede_id));

grant select on public.inventario, public.material_areas, public.inventario_movimientos, public.inventario_joyas, public.inventario_joyas_importaciones to authenticated;
grant insert, update, delete on public.inventario, public.material_areas, public.inventario_joyas, public.inventario_joyas_importaciones to authenticated;
grant insert on public.inventario_movimientos to authenticated;
