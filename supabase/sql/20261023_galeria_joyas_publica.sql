-- Galería pública de joyas.
-- Devuelve únicamente fichas de productos publicados y catálogos visibles.
-- No expone rutas privadas de Mi Nube, notas internas ni enlaces de almacenamiento.
begin;

create or replace function public.obtener_galeria_joyas_publica()
returns table (
  catalogo_slug text,
  taller text,
  producto_id uuid,
  nombre text,
  categoria text,
  descripcion text,
  imagen_principal_url text,
  galeria jsonb,
  precio_desde numeric,
  moneda text,
  destacado boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.slug,
    c.nombre_publico,
    p.id,
    p.nombre,
    p.categoria,
    p.descripcion,
    p.imagen_principal_url,
    p.galeria,
    case when p.mostrar_precio then p.precio_desde else null end,
    p.moneda,
    p.destacado
  from public.catalogo_configuracion c
  join public.catalogo_productos p
    on p.participante_id = c.participante_id
  where c.visible = true
    and p.publicado = true
  order by p.destacado desc nulls last, p.orden asc nulls last, p.nombre asc;
$$;

revoke all on function public.obtener_galeria_joyas_publica() from public;
grant execute on function public.obtener_galeria_joyas_publica() to anon, authenticated;

notify pgrst, 'reload schema';
commit;
