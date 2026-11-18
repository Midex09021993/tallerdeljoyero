-- Corrección canónica de slugs del Catálogo de Joyas.
-- Un slug es solo la ruta pública, nunca una URL completa.

begin;

create or replace function public.catalogo_normalizar_slug(_value text)
returns text
language plpgsql
immutable
set search_path=''
as $$
declare
  v_value text := btrim(coalesce(_value,''));
begin
  -- Si el usuario pega una URL completa, conservar únicamente su pathname.
  if v_value ~* '^[a-z][a-z0-9+.-]*://[^/]+/?' then
    v_value := regexp_replace(v_value, '^[a-z][a-z0-9+.-]*://[^/]+/?', '', 1, 1, 'i');
  elsif v_value ~* '^www\.[^/]+/?' then
    v_value := regexp_replace(v_value, '^www\.[^/]+/?', '', 1, 1, 'i');
  end if;

  -- No guardar query string ni fragmentos en la identidad pública.
  v_value := regexp_replace(v_value, '[?#].*$', '');
  v_value := regexp_replace(v_value, '^/+|/+$', '', 'g');

  return left(
    regexp_replace(
      regexp_replace(lower(v_value), '[^a-z0-9]+', '-', 'g'),
      '(^-+|-+$)', '', 'g'
    ),
    80
  );
end;
$$;

-- Reparar el caso actualmente detectado sin tocar otros datos.
-- Si ya existe /fadilab para otro participante, detenemos la migración
-- en lugar de provocar una colisión silenciosa.
do $$
begin
  if exists (
    select 1
    from public.catalogo_configuracion
    where slug = 'https-www-tallerdeljoyero-com-fadilab'
  ) and exists (
    select 1
    from public.catalogo_configuracion
    where slug = 'fadilab'
  ) then
    raise exception 'CATALOGO_SLUG_CONFLICTO: existen simultáneamente el slug incorrecto y /fadilab; resolver antes de migrar';
  end if;

  update public.catalogo_configuracion
  set slug = 'fadilab'
  where slug = 'https-www-tallerdeljoyero-com-fadilab';

  update public.catalogo_configuracion
  set slug = regexp_replace(slug, '^www-tallerdeljoyero-com-', '')
  where slug like 'www-tallerdeljoyero-com-%';
end $$;

notify pgrst, 'reload schema';
commit;
