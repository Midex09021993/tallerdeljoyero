alter table public.pedidos
  add column if not exists cliente_id uuid references public.clientes(id) on delete set null;

create index if not exists pedidos_cliente_id_idx on public.pedidos(cliente_id);

comment on column public.pedidos.cliente_id is
  'Cliente maestro del pedido. El campo cliente se conserva temporalmente como snapshot/histórico.';