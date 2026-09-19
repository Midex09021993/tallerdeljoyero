-- Datos comerciales por pedido: a cuenta y saldo calculado.
alter table public.pedidos
  add column if not exists a_cuenta numeric(12,2) not null default 0,
  add column if not exists saldo numeric(12,2)
    generated always as (
      greatest(coalesce(importe, 0)::numeric - coalesce(a_cuenta, 0)::numeric, 0::numeric)
    ) stored;

alter table public.pedidos
  drop constraint if exists pedidos_a_cuenta_nonnegative,
  drop constraint if exists pedidos_a_cuenta_not_greater_than_importe;

alter table public.pedidos
  add constraint pedidos_a_cuenta_nonnegative check (a_cuenta >= 0),
  add constraint pedidos_a_cuenta_not_greater_than_importe
    check (a_cuenta <= greatest(coalesce(importe, 0), 0));
