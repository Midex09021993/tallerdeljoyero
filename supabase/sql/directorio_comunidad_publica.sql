-- Directorio público de Comunidad para Taller del Joyero.
-- Requiere aplicar primero comunidad_visibilidad_owner.sql para crear comunidad_visible.\n-- Incluye solo campos públicos de identidad comercial; no expone RUC ni datos fiscales.
-- Expone solo datos comerciales mínimos de participantes activos y publicaciones habilitadas.
-- Aplicar manualmente en Lovable Cloud > Supabase SQL Editor.

begin;

create or replace function public.obtener_directorio_comunidad_publica()
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
  productos_publicados bigint
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    'taller'::text,
    ep.id,
    coalesce(nullif(btrim(c.nombre_publico), ''), ep.nombre),
    coalesce(c.descripcion, ep.descripcion),
    c.logo_url,
    case when c.visible then c.slug else null end,
    coalesce(c.visible, false),
    null::text,
    null::text,
    case when c.visible then (
      select count(*)::bigint
      from public.catalogo_productos p
      where p.participante_id = ep.id
        and p.publicado = true
    ) else 0::bigint end
  from public.ecosistema_participantes ep
  left join public.catalogo_configuracion c on c.participante_id = ep.id
  where ep.estado = 'activo'
    and coalesce(ep.comunidad_visible, true) = true
    and ep.tipo_participante in ('organizacion', 'profesional')
    and (
      c.id is null
      or c.visible = true
      or coalesce(c.formacion_visible, false) = true
    )

  union all

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
    0::bigint
  from public.catalogo_configuracion c
  join public.ecosistema_participantes ep on ep.id = c.participante_id
  where ep.estado = 'activo'
    and coalesce(ep.comunidad_visible, true) = true
    and c.formacion_visible = true
  order by 3, 1;
$function$;

revoke all on function public.obtener_directorio_comunidad_publica() from public;
grant execute on function public.obtener_directorio_comunidad_publica() to anon, authenticated;

notify pgrst, 'reload schema';
commit;

-- Verificación: devuelve talleres activos y publicaciones formativas habilitadas.
select * from public.obtener_directorio_comunidad_publica();
