-- Directorio público de Comunidad para Taller del Joyero.
-- Requiere aplicar primero comunidad_visibilidad_owner.sql para crear comunidad_visible.
-- Expone únicamente campos públicos de identidad comercial; nunca RUC ni datos fiscales.
-- Ejecutar manualmente en Lovable Cloud > Supabase SQL Editor.

begin;

-- Hay que recrear la función porque PostgreSQL no permite cambiar
-- el tipo de retorno de una función con CREATE OR REPLACE.
drop function if exists public.obtener_directorio_comunidad_publica();

create function public.obtener_directorio_comunidad_publica()
returns table (
  tipo text,
  participante_id uuid,
  nombre text,
  descripcion text,
  imagen_url text,
  slug text,
  catalogo_visible boolean,
  formacion_titulo text,
  formacion_descripcion text,
  productos_publicados bigint,
  identidad_nombre text,
  identidad_logo text,
  identidad_ciudad text,
  identidad_pais text,
  identidad_sitio_web text
)
language sql
stable
security definer
set search_path = ''
as $function$
  -- Talleres y profesionales activos.
  select
    'taller'::text,
    ep.id,
    coalesce(nullif(btrim(c.nombre_publico), ''), ep.nombre),
    coalesce(c.descripcion, ep.descripcion),
    c.logo_url,
    case when coalesce(c.visible, false) then c.slug else null end,
    coalesce(c.visible, false),
    null::text,
    null::text,
    case when coalesce(c.visible, false) then (
      select count(*)::bigint
      from public.catalogo_productos p
      where p.participante_id = ep.id
        and p.publicado = true
    ) else 0::bigint end,
    ic.nombre_comercial,
    ic.logo_url,
    ic.ciudad,
    ic.pais_nombre,
    ic.sitio_web
  from public.ecosistema_participantes ep
  left join public.catalogo_configuracion c
    on c.participante_id = ep.id
  left join lateral (
    select i.nombre_comercial, i.logo_url, i.ciudad, i.pais_nombre, i.sitio_web
    from public.identidades_comerciales i
    where i.participante_id = ep.id
      and i.activa = true
    order by i.nombre_comercial
    limit 1
  ) ic on true
  where ep.estado = 'activo'
    and coalesce(ep.comunidad_visible, true) = true
    and ep.tipo_participante in ('organizacion', 'profesional')
    and (
      c.id is null
      or c.visible = true
      or coalesce(c.formacion_visible, false) = true
    )

  union all

  -- Publicaciones de cursos y formación.
  select
    'curso'::text,
    ep.id,
    coalesce(nullif(btrim(c.nombre_publico), ''), ep.nombre),
    c.descripcion,
    coalesce(nullif(btrim(c.formacion_imagen_url), ''), c.logo_url),
    c.slug,
    coalesce(c.visible, false),
    coalesce(nullif(btrim(c.formacion_titulo), ''), 'Cursos y formación'),
    c.formacion_descripcion,
    0::bigint,
    ic.nombre_comercial,
    ic.logo_url,
    ic.ciudad,
    ic.pais_nombre,
    ic.sitio_web
  from public.catalogo_configuracion c
  join public.ecosistema_participantes ep
    on ep.id = c.participante_id
  left join lateral (
    select i.nombre_comercial, i.logo_url, i.ciudad, i.pais_nombre, i.sitio_web
    from public.identidades_comerciales i
    where i.participante_id = ep.id
      and i.activa = true
    order by i.nombre_comercial
    limit 1
  ) ic on true
  where ep.estado = 'activo'
    and coalesce(ep.comunidad_visible, true) = true
    and c.formacion_visible = true

  order by 3, 1;
$function$;

revoke all on function public.obtener_directorio_comunidad_publica() from public;
grant execute on function public.obtener_directorio_comunidad_publica() to anon, authenticated;

notify pgrst, 'reload schema';
commit;

-- Verificación: muestra identidad comercial junto con cada entrada pública.
select *
from public.obtener_directorio_comunidad_publica()
order by nombre, tipo;

select tipo, count(*) as total
from public.obtener_directorio_comunidad_publica()
group by tipo
order by tipo;
