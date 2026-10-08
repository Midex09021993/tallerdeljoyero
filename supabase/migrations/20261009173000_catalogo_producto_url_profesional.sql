-- Catálogo profesional v1: identificación pública individual por slug de producto.
begin;

drop function if exists public.obtener_catalogo_publico(text);

create function public.obtener_catalogo_publico(_slug text)
returns table(
  slug text,
  nombre_publico text,
  descripcion_publica text,
  logo_url text,
  whatsapp text,
  producto_id uuid,
  producto_slug text,
  codigo text,
  nombre text,
  categoria text,
  descripcion_producto text,
  imagen_principal_url text,
  galeria jsonb,
  video_url text,
  aurum_render_url text,
  precio_desde numeric,
  moneda text,
  destacado boolean,
  metal_principal text,
  peso_gramos numeric,
  piedras text,
  medidas text,
  talla text,
  tecnica text,
  acabado text,
  disponibilidad text,
  tiempo_fabricacion_dias integer,
  ficha_tecnica_url text,
  mostrar_precio boolean,
  mostrar_ficha_tecnica boolean
)
language sql
stable
security definer
set search_path=''
as $$
  select
    c.slug,
    c.nombre_publico,
    c.descripcion,
    c.logo_url,
    c.whatsapp,
    p.id,
    p.slug,
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
    p.destacado,
    p.metal_principal,
    p.peso_gramos,
    p.piedras,
    p.medidas,
    p.talla,
    p.tecnica,
    p.acabado,
    p.disponibilidad,
    p.tiempo_fabricacion_dias,
    p.ficha_tecnica_url,
    p.mostrar_precio,
    p.mostrar_ficha_tecnica
  from public.catalogo_configuracion c
  left join public.catalogo_productos p
    on p.participante_id = c.participante_id
   and p.publicado = true
  where lower(trim(c.slug)) = lower(trim(_slug))
    and c.visible = true
  order by p.destacado desc, p.orden asc, p.nombre asc;
$$;

revoke all on function public.obtener_catalogo_publico(text) from public;
grant execute on function public.obtener_catalogo_publico(text) to anon, authenticated;

notify pgrst, 'reload schema';
commit;
