-- Configuración independiente de portada por taller: frase y carrusel de hasta 10 imágenes.
begin;

alter table public.catalogo_configuracion
  add column if not exists frase_portada text,
  add column if not exists imagenes_portada jsonb not null default '[]'::jsonb,
  add column if not exists intervalo_portada_segundos integer not null default 5;

alter table public.catalogo_configuracion
  drop constraint if exists catalogo_configuracion_intervalo_portada_check,
  add constraint catalogo_configuracion_intervalo_portada_check
    check (intervalo_portada_segundos between 2 and 30),
  drop constraint if exists catalogo_configuracion_imagenes_portada_check,
  add constraint catalogo_configuracion_imagenes_portada_check
    check (jsonb_typeof(imagenes_portada) = 'array' and jsonb_array_length(imagenes_portada) <= 10);

create or replace function public.obtener_catalogo_publico_v2(_slug text)
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
  mostrar_ficha_tecnica boolean,
  coleccion_slug text,
  coleccion_nombre text,
  frase_portada text,
  imagenes_portada jsonb,
  intervalo_portada_segundos integer
)
language sql
stable
security definer
set search_path=''
as $$
  select distinct on (p.id, col.id)
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
    case when p.mostrar_ficha_tecnica then p.ficha_tecnica_url else null end,
    p.mostrar_precio,
    p.mostrar_ficha_tecnica,
    col.slug,
    col.nombre,
    c.frase_portada,
    c.imagenes_portada,
    c.intervalo_portada_segundos
  from public.catalogo_configuracion c
  left join public.catalogo_productos p
    on p.participante_id = c.participante_id
   and p.publicado = true
  left join public.catalogo_productos_colecciones pc
    on pc.producto_id = p.id
  left join public.catalogo_colecciones col
    on col.id = pc.coleccion_id
   and col.participante_id = c.participante_id
   and col.publicado = true
  where lower(trim(c.slug)) = lower(trim(_slug))
    and c.visible = true
  order by p.id, col.id, p.destacado desc, p.orden asc, p.nombre asc;
$$;

revoke all on function public.obtener_catalogo_publico_v2(text) from public;
grant execute on function public.obtener_catalogo_publico_v2(text) to anon, authenticated;

notify pgrst, 'reload schema';
commit;
