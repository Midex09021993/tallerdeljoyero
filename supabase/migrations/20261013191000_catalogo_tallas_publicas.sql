-- Expone solo la configuración de talla de productos publicados en catálogos visibles.
begin;
create or replace function public.obtener_tallas_catalogo_publico(_slug text)
returns table(
  producto_id uuid,
  modalidad_talla text,
  sistema_tallas text,
  tallas_disponibles text
)
language sql
stable
security definer
set search_path=''
as $$
  select p.id, p.modalidad_talla, p.sistema_tallas, p.tallas_disponibles
  from public.catalogo_configuracion c
  join public.catalogo_productos p on p.participante_id = c.participante_id
  where lower(trim(c.slug)) = lower(trim(_slug))
    and c.visible = true
    and p.publicado = true;
$$;
revoke all on function public.obtener_tallas_catalogo_publico(text) from public;
grant execute on function public.obtener_tallas_catalogo_publico(text) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
