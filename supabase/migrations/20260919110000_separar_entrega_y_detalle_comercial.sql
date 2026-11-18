alter table public.pedidos
  add column if not exists cotizacion_detalles jsonb not null default '[]'::jsonb,
  add column if not exists especificaciones_comerciales jsonb not null default '{}'::jsonb;
create index if not exists pedidos_cotizacion_id_idx on public.pedidos(cotizacion_id);
create index if not exists pedidos_proyecto_joya_id_idx on public.pedidos(proyecto_joya_id);
