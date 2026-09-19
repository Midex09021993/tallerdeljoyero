create or replace function public.aplicar_movimiento_inventario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tipo = 'entrada' then
    update public.inventario
    set stock = stock + abs(new.cantidad)
    where id = new.material_id;
  else
    update public.inventario
    set stock = stock - abs(new.cantidad)
    where id = new.material_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.aplicar_movimiento_inventario() from public, anon, authenticated;

drop trigger if exists mov_inventario_aplica on public.inventario_movimientos;
create trigger mov_inventario_aplica
after insert on public.inventario_movimientos
for each row execute function public.aplicar_movimiento_inventario();