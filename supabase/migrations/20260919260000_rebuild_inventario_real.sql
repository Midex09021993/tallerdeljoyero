alter table public.inventario
  add column if not exists categoria text not null default 'Otros insumos',
  add column if not exists codigo text not null default '',
  add column if not exists lote text not null default '',
  add column if not exists ubicacion text not null default '',
  add column if not exists proveedor text not null default '',
  add column if not exists costo_unitario numeric not null default 0,
  add column if not exists activo boolean not null default true;

alter table public.inventario_movimientos
  add column if not exists stock_anterior numeric,
  add column if not exists stock_posterior numeric,
  add column if not exists referencia_externa text not null default '';

alter table public.inventario_movimientos
  drop constraint if exists inventario_movimientos_tipo_check;

alter table public.inventario_movimientos
  add constraint inventario_movimientos_tipo_check
  check (tipo in ('entrada','consumo','devolucion','merma','ajuste_positivo','ajuste_negativo'));

create index if not exists inventario_sede_activo_idx on public.inventario(sede_id, activo);
create index if not exists inventario_categoria_idx on public.inventario(categoria);
create index if not exists inventario_movimientos_material_created_idx on public.inventario_movimientos(material_id, created_at desc);
create index if not exists inventario_joyas_sede_estado_idx on public.inventario_joyas(sede_id, estado);
create unique index if not exists inventario_joyas_sede_codigo_uidx on public.inventario_joyas(sede_id, lower(trim(codigo)));

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
  if new.cantidad is null or new.cantidad <= 0 then
    raise exception 'La cantidad del movimiento debe ser mayor que cero';
  end if;

  v_delta := case
    when new.tipo in ('entrada','devolucion','ajuste_positivo') then abs(new.cantidad)
    when new.tipo in ('consumo','merma','ajuste_negativo') then -abs(new.cantidad)
    else 0
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

drop trigger if exists mov_inventario_aplica on public.inventario_movimientos;
create trigger mov_inventario_aplica
before insert on public.inventario_movimientos
for each row execute function public.aplicar_movimiento_inventario();

revoke all on function public.aplicar_movimiento_inventario() from public, anon, authenticated;

revoke update on public.inventario from authenticated;
grant update (material, unidad, minimo, categoria, codigo, lote, ubicacion, proveedor, costo_unitario, activo)
  on public.inventario to authenticated;

revoke insert on public.inventario from authenticated;
grant insert (material, unidad, minimo, categoria, codigo, lote, ubicacion, proveedor, costo_unitario, activo, sede_id)
  on public.inventario to authenticated;