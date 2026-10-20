-- Taller del Joyero: publicación externa independiente para Cursos y formación.
-- Reutiliza catalogo_configuracion (participante, nombre, logo, descripción y slug).
-- No cambia la visibilidad del catálogo de joyas.
begin;

alter table public.catalogo_configuracion
  add column if not exists formacion_visible boolean not null default false,
  add column if not exists formacion_titulo text,
  add column if not exists formacion_descripcion text,
  add column if not exists formacion_imagen_url text;

create or replace function public.obtener_publicidad_formacion(_slug text)
returns table (
  slug text,
  nombre_publico text,
  descripcion text,
  logo_url text,
  whatsapp text,
  formacion_titulo text,
  formacion_descripcion text,
  formacion_imagen_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.slug,
    c.nombre_publico,
    c.descripcion,
    c.logo_url,
    c.whatsapp,
    c.formacion_titulo,
    c.formacion_descripcion,
    c.formacion_imagen_url
  from public.catalogo_configuracion c
  where lower(trim(c.slug)) = lower(trim(_slug))
    and c.formacion_visible = true
  limit 1;
$$;

revoke all on function public.obtener_publicidad_formacion(text) from public;
grant execute on function public.obtener_publicidad_formacion(text) to anon, authenticated;

notify pgrst, 'reload schema';
commit;

-- Verificación de las columnas añadidas (no publica ninguna página por sí sola).
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'catalogo_configuracion'
  and column_name in (
    'formacion_visible',
    'formacion_titulo',
    'formacion_descripcion',
    'formacion_imagen_url'
  )
order by column_name;
