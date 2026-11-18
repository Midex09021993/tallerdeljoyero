-- Mantiene la normalización de slugs coherente entre la aplicación y PostgreSQL.
-- No actualiza ni elimina productos existentes.
begin;

create or replace function public.catalogo_normalizar_slug(_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(
    regexp_replace(
      regexp_replace(
        translate(
          lower(btrim(coalesce(_value, ''))),
          'áéíóúüñ',
          'aeiouun'
        ),
        '[^a-z0-9]+',
        '-',
        'g'
      ),
      '(^-+|-+$)',
      '',
      'g'
    ),
    80
  );
$$;

commit;
