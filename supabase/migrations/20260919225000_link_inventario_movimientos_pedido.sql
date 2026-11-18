alter table public.inventario_movimientos
  add column if not exists pedido_id uuid references public.pedidos(id) on delete set null;

create index if not exists inventario_movimientos_pedido_id_idx
  on public.inventario_movimientos(pedido_id);

comment on column public.inventario_movimientos.pedido_id is
  'Pedido asociado al movimiento de inventario. Permite trazabilidad del consumo o entrada sin depender del texto del motivo.';
