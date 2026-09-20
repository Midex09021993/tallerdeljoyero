create table if not exists public.pedido_materiales (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  material_id uuid not null references public.inventario(id) on delete restrict,
  cantidad_planificada numeric not null check (cantidad_planificada > 0),
  unidad text not null default '',
  notas text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pedido_id, material_id)
);

create index if not exists pedido_materiales_pedido_idx on public.pedido_materiales(pedido_id);
create index if not exists pedido_materiales_material_idx on public.pedido_materiales(material_id);

alter table public.pedido_materiales enable row level security;

drop policy if exists "pedido materiales leer sede" on public.pedido_materiales;
create policy "pedido materiales leer sede"
on public.pedido_materiales for select to authenticated
using (exists (select 1 from public.pedidos p where p.id = pedido_materiales.pedido_id and ve_sede(auth.uid(), p.sede_id)));

drop policy if exists "pedido materiales crear operativo" on public.pedido_materiales;
create policy "pedido materiales crear operativo"
on public.pedido_materiales for insert to authenticated
with check (
  exists (select 1 from public.pedidos p where p.id = pedido_materiales.pedido_id and ve_sede(auth.uid(), p.sede_id))
  and exists (select 1 from public.inventario i where i.id = pedido_materiales.material_id and ve_sede(auth.uid(), i.sede_id) and i.activo)
  and (es_admin(auth.uid()) or has_role(auth.uid(), 'operario'::app_role) or has_role(auth.uid(), 'monitor'::app_role))
);

drop policy if exists "pedido materiales actualizar operativo" on public.pedido_materiales;
create policy "pedido materiales actualizar operativo"
on public.pedido_materiales for update to authenticated
using (
  exists (select 1 from public.pedidos p where p.id = pedido_materiales.pedido_id and ve_sede(auth.uid(), p.sede_id))
  and (es_admin(auth.uid()) or has_role(auth.uid(), 'operario'::app_role) or has_role(auth.uid(), 'monitor'::app_role))
)
with check (
  exists (select 1 from public.pedidos p where p.id = pedido_materiales.pedido_id and ve_sede(auth.uid(), p.sede_id))
  and exists (select 1 from public.inventario i where i.id = pedido_materiales.material_id and ve_sede(auth.uid(), i.sede_id) and i.activo)
  and cantidad_planificada > 0
);

drop policy if exists "pedido materiales borrar operativo" on public.pedido_materiales;
create policy "pedido materiales borrar operativo"
on public.pedido_materiales for delete to authenticated
using (
  exists (select 1 from public.pedidos p where p.id = pedido_materiales.pedido_id and ve_sede(auth.uid(), p.sede_id))
  and (es_admin(auth.uid()) or has_role(auth.uid(), 'operario'::app_role) or has_role(auth.uid(), 'monitor'::app_role))
);