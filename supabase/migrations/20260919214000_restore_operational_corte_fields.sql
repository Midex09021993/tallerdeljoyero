alter table public.pedidos
  add column if not exists corte_texto text not null default '',
  add column if not exists corte_tipografia text not null default '',
  add column if not exists corte_ubicacion text not null default '',
  add column if not exists corte_observaciones text not null default '';

grant select (corte_texto, corte_tipografia, corte_ubicacion, corte_observaciones)
  on table public.pedidos to authenticated;

grant insert (corte_texto, corte_tipografia, corte_ubicacion, corte_observaciones)
  on table public.pedidos to authenticated;

grant update (corte_texto, corte_tipografia, corte_ubicacion, corte_observaciones)
  on table public.pedidos to authenticated;