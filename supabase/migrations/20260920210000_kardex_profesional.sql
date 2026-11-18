alter table public.inventario_movimientos
  drop constraint if exists inventario_movimientos_cantidad_positiva_check;
alter table public.inventario_movimientos
  add constraint inventario_movimientos_cantidad_positiva_check
  check (cantidad > 0);

alter table public.inventario_movimientos
  drop constraint if exists inventario_movimientos_motivo_requerido_check;
alter table public.inventario_movimientos
  add constraint inventario_movimientos_motivo_requerido_check
  check (length(trim(coalesce(motivo, ''))) > 0);

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
  v_activo boolean;
begin
  select i.stock, i.activo
    into v_stock, v_activo
  from public.inventario i
  where i.id = new.material_id
  for update;

  if not found then
    raise exception 'Material de inventario no encontrado';
  end if;

  if not v_activo then
    raise exception 'No se puede registrar movimiento sobre un material inactivo';
  end if;

  if new.cantidad is null or new.cantidad <= 0 then
    raise exception 'La cantidad del movimiento debe ser mayor que cero';
  end if;

  if length(trim(coalesce(new.motivo, ''))) = 0 then
    raise exception 'El motivo del movimiento es obligatorio';
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

create index if not exists inventario_movimientos_tipo_created_idx
  on public.inventario_movimientos(tipo, created_at desc);

create index if not exists inventario_movimientos_pedido_idx
  on public.inventario_movimientos(pedido_id)
  where pedido_id is not null;
