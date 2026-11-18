-- Catálogo profesional v1: ficha técnica, visibilidad comercial y datos públicos controlados.
-- Fuente de verdad: catalogo_productos.participante_id
-- No crea dependencias con producción ni expone costos internos.

begin;

alter table public.catalogo_productos
  add column if not exists metal_principal text,
  add column if not exists peso_gramos numeric(10,3),
  add column if not exists piedras text,
  add column if not exists medidas text,
  add column if not exists talla text,
  add column if not exists tecnica text,
  add column if not exists acabado text,
  add column if not exists disponibilidad text not null default 'Consultar',
  add column if not exists tiempo_fabricacion_dias integer,
  add column if not exists ficha_tecnica_url text,
  add column if not exists notas_internas text,
  add column if not exists mostrar_precio boolean not null default true,
  add column if not exists mostrar_ficha_tecnica boolean not null default true;

update public.catalogo_productos
set precio_desde = null
where precio_desde = 0;

update public.catalogo_productos
set slug = public.catalogo_normalizar_slug(nombre)
where slug in ('c', 't')
  and public.catalogo_normalizar_slug(nombre) <> ''
  and not exists (
    select 1
    from public.catalogo_productos p2
    where p2.participante_id = catalogo_productos.participante_id
      and p2.slug = public.catalogo_normalizar_slug(catalogo_productos.nombre)
      and p2.id <> catalogo_productos.id
  );

alter table public.catalogo_productos
  drop constraint if exists catalogo_productos_precio_chk;

alter table public.catalogo_productos
  add constraint catalogo_productos_precio_chk
  check (precio_desde is null or precio_desde > 0);

alter table public.catalogo_productos
  drop constraint if exists catalogo_productos_peso_chk;

alter table public.catalogo_productos
  add constraint catalogo_productos_peso_chk
  check (peso_gramos is null or peso_gramos > 0);

alter table public.catalogo_productos
  drop constraint if exists catalogo_productos_tiempo_chk;

alter table public.catalogo_productos
  add constraint catalogo_productos_tiempo_chk
  check (tiempo_fabricacion_dias is null or tiempo_fabricacion_dias > 0);

drop function if exists public.obtener_catalogo_publico(text);

create function public.obtener_catalogo_publico(_slug text)
returns table(
  slug text,
  nombre_publico text,
  descripcion_publica text,
  logo_url text,
  whatsapp text,
  producto_id uuid,
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
