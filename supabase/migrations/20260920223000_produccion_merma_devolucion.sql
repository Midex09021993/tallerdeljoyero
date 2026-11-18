-- La semántica de producción usa los tipos ya auditados del Kardex:
-- consumo/merma disminuyen stock; devolucion aumenta stock.
-- Se endurece la referencia para que los movimientos de producción sean trazables.
alter table public.inventario_movimientos
  drop constraint if exists inventario_movimientos_produccion_referencia_check;
alter table public.inventario_movimientos
  add constraint inventario_movimientos_produccion_referencia_check
  check (
    pedido_id is null
    or length(trim(coalesce(referencia_externa, ''))) > 0
  );

create index if not exists inventario_movimientos_pedido_tipo_created_idx
  on public.inventario_movimientos(pedido_id, tipo, created_at desc)
  where pedido_id is not null;