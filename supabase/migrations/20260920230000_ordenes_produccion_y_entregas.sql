create table if not exists public.ordenes_produccion (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  sede_id uuid references public.sedes(id) on delete restrict,
  numero text not null,
  estado text not null default 'borrador',
  prioridad text not null default 'normal',
  responsable_user_id uuid,
  fecha_planificada_inicio date,
  fecha_planificada_fin date,
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  notas text not null default '',
  creado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ordenes_produccion_pedido_unique unique (pedido_id),
  constraint ordenes_produccion_numero_unique unique (numero),
  constraint ordenes_produccion_estado_check check (estado in ('borrador','liberada','en_produccion','pausada','control_calidad','terminada','cancelada')),
  constraint ordenes_produccion_prioridad_check check (prioridad in ('baja','normal','alta','urgente'))
);

create table if not exists public.orden_produccion_entregas (
  id uuid primary key default gen_random_uuid(),
  orden_produccion_id uuid not null references public.ordenes_produccion(id) on delete cascade,
  material_id uuid not null references public.inventario(id) on delete restrict,
  cantidad numeric not null,
  unidad text not null default '',
  entregado_por uuid,
  recibido_por uuid,
  area_destino text not null default '',
  notas text not null default '',
  created_at timestamptz not null default now(),
  constraint orden_produccion_entrega_cantidad_check check (cantidad > 0)
);

create index if not exists ordenes_produccion_sede_estado_idx on public.ordenes_produccion(sede_id, estado);
create index if not exists orden_produccion_entregas_op_idx on public.orden_produccion_entregas(orden_produccion_id, created_at desc);
create index if not exists orden_produccion_entregas_material_idx on public.orden_produccion_entregas(material_id, created_at desc);

alter table public.ordenes_produccion enable row level security;
alter table public.orden_produccion_entregas enable row level security;

drop policy if exists "op leer sede" on public.ordenes_produccion;
create policy "op leer sede" on public.ordenes_produccion for select to authenticated
using (ve_sede(auth.uid(), sede_id));

drop policy if exists "op crear operativo" on public.ordenes_produccion;
create policy "op crear operativo" on public.ordenes_produccion for insert to authenticated
with check (
  ve_sede(auth.uid(), sede_id)
  and (es_admin(auth.uid()) or has_role(auth.uid(),'operario') or has_role(auth.uid(),'monitor'))
  and exists (select 1 from public.pedidos p where p.id = pedido_id and p.sede_id = sede_id)
);

drop policy if exists "op actualizar operativo" on public.ordenes_produccion;
create policy "op actualizar operativo" on public.ordenes_produccion for update to authenticated
using (ve_sede(auth.uid(), sede_id) and (es_admin(auth.uid()) or has_role(auth.uid(),'operario') or has_role(auth.uid(),'monitor')))
with check (ve_sede(auth.uid(), sede_id) and (es_admin(auth.uid()) or has_role(auth.uid(),'operario') or has_role(auth.uid(),'monitor')));

drop policy if exists "op entrega leer sede" on public.orden_produccion_entregas;
create policy "op entrega leer sede" on public.orden_produccion_entregas for select to authenticated
using (exists (select 1 from public.ordenes_produccion op where op.id = orden_produccion_id and ve_sede(auth.uid(), op.sede_id)));

drop policy if exists "op entrega crear operativo" on public.orden_produccion_entregas;
create policy "op entrega crear operativo" on public.orden_produccion_entregas for insert to authenticated
with check (
  (es_admin(auth.uid()) or has_role(auth.uid(),'operario') or has_role(auth.uid(),'monitor'))
  and exists (select 1 from public.ordenes_produccion op where op.id = orden_produccion_id and ve_sede(auth.uid(), op.sede_id))
  and exists (select 1 from public.inventario i join public.ordenes_produccion op on op.id = orden_produccion_id where i.id = material_id and i.sede_id = op.sede_id and i.activo)
);

create or replace function public.touch_ordenes_produccion()
returns trigger language plpgsql set search_path=''
as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_touch_ordenes_produccion on public.ordenes_produccion;
create trigger trg_touch_ordenes_produccion before update on public.ordenes_produccion for each row execute function public.touch_ordenes_produccion();