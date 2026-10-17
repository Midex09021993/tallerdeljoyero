-- Enable one level of subcategories in the professional catalog.
begin;

alter table public.catalogo_categorias
  add column if not exists parent_id uuid null
  references public.catalogo_categorias(id) on delete restrict;

create index if not exists catalogo_categorias_parent_idx
  on public.catalogo_categorias(participante_id, parent_id, orden, nombre);

create or replace function public.catalogo_categorias_slug()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_slug text;
begin
  new.nombre := trim(new.nombre);
  if new.parent_id is not null then
    select slug into parent_slug
    from public.catalogo_categorias
    where id = new.parent_id
      and participante_id = new.participante_id
      and parent_id is null;

    if parent_slug is null then
      raise exception 'La subcategoría debe pertenecer a una categoría principal del mismo catálogo.';
    end if;

    new.slug := left(parent_slug || '-' || public.catalogo_normalizar_slug(new.nombre), 80);
  else
    new.slug := public.catalogo_normalizar_slug(new.nombre);
  end if;
  new.updated_at := now();
  return new;
end;
$$;

notify pgrst, 'reload schema';
commit;
