-- Catálogo público por sede: el slug identifica de forma estable la publicación.
-- Mantiene la superficie pública limitada a los campos comerciales definidos por el catálogo.
-- LEFT JOIN permite publicar/configurar un catálogo incluso antes de tener modelos publicados.
create or replace function public.obtener_catalogo_publico(_slug text)
returns table (
  sede_id uuid,
  slug text,
  nombre_publico text,
  descripcion_publica text,
  logo_url text,
  portada_url text,
  whatsapp text,
  instagram_url text,
  producto_id uuid,
  codigo text,
  nombre text,
  categoria text,
  descripcion text,
  imagen_principal_url text,
  galeria jsonb,
  video_url text,
  aurum_render_url text,
  precio_desde numeric,
  moneda text,
  destacado boolean
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    c.sede_id,
    c.slug,
    c.nombre_publico,
    c.descripcion_publica,
    c.logo_url,
    c.portada_url,
    c.whatsapp,
    c.instagram_url,
    p.id,
    p.codigo,
    p.nombre,
    p.categoria,
    p.descripcion,
    p.imagen_principal_url,
    p.galeria,
    p.video_url,
    p.aurum_render_url,
    p.precio_desde,
    p.moneda,
    p.destacado
  from public.catalogo_configuracion c
  left join public.catalogo_productos p
    on p.sede_id = c.sede_id
   and p.publicado = true
  where lower(trim(c.slug)) = lower(trim(_slug))
    and c.visible = true
  order by p.destacado desc nulls last, p.orden nulls last, p.nombre nulls last;
$$;

revoke all on function public.obtener_catalogo_publico(text) from public, anon;
grant execute on function public.obtener_catalogo_publico(text) to anon, authenticated;
