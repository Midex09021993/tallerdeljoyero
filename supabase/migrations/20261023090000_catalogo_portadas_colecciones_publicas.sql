-- Exponer las portadas propias de las colecciones al catálogo público.
begin;

create or replace function public.obtener_portadas_colecciones_publicas(_slug text)
returns table (
  coleccion_slug text,
  coleccion_nombre text,
  imagen_portada_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select col.slug, col.nombre, col.imagen_url
  from public.catalogo_configuracion c
  join public.catalogo_colecciones col
    on col.participante_id = c.participante_id
  where lower(trim(c.slug)) = lower(trim(_slug))
    and c.visible = true
    and col.publicado = true
  order by col.orden asc, col.nombre asc;
$$;

revoke all on function public.obtener_portadas_colecciones_publicas(text) from public;
grant execute on function public.obtener_portadas_colecciones_publicas(text) to anon, authenticated;

notify pgrst, 'reload schema';
commit;
