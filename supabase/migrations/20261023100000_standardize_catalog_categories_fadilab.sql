-- Standardize all workshop catalogs to the Fadilab category list.
-- Idempotent: it adds/repairs canonical categories and hides known legacy labels
-- without deleting category rows or reclassifying existing products.
begin;

create or replace function public.catalogo_sembrar_categorias_base()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.catalogo_categorias (participante_id, nombre, slug, orden, activo)
  values
    (new.participante_id, 'Anillos', 'anillos', 10, true),
    (new.participante_id, 'Aretes', 'aretes', 20, true),
    (new.participante_id, 'Collares', 'collares', 30, true),
    (new.participante_id, 'Pulseras', 'pulseras', 40, true),
    (new.participante_id, 'Dijes', 'dijes', 50, true),
    (new.participante_id, 'Broches', 'broches', 60, true),
    (new.participante_id, 'Sets / Conjuntos', 'sets-conjuntos', 80, true),
    (new.participante_id, 'Otros', 'otros', 90, true)
  on conflict (participante_id, slug) do update
    set nombre = excluded.nombre,
        orden = excluded.orden,
        activo = true,
        parent_id = null;

  return new;
end;
$$;

-- Backfill every participant with a catalog or catalog products, not just the
-- catalogs visible to one particular workshop account.
insert into public.catalogo_categorias (participante_id, nombre, slug, orden, activo)
select participantes.participante_id, base.nombre, base.slug, base.orden, true
from (
  select participante_id from public.catalogo_configuracion where participante_id is not null
  union
  select participante_id from public.catalogo_productos where participante_id is not null
) as participantes
cross join (
  values
    ('Anillos', 'anillos', 10),
    ('Aretes', 'aretes', 20),
    ('Collares', 'collares', 30),
    ('Pulseras', 'pulseras', 40),
    ('Dijes', 'dijes', 50),
    ('Broches', 'broches', 60),
    ('Sets / Conjuntos', 'sets-conjuntos', 80),
    ('Otros', 'otros', 90)
) as base(nombre, slug, orden)
on conflict (participante_id, slug) do update
  set nombre = excluded.nombre,
      orden = excluded.orden,
      activo = true,
      parent_id = null;

-- Hide old aliases/custom labels that differ from the approved Fadilab standard.
-- Keep the rows so historical references are not deleted.
update public.catalogo_categorias
set activo = false
where lower(trim(slug)) in ('sortijas', 'alianzas', 'conjuntos', 'pareja')
  and activo = true;

notify pgrst, 'reload schema';
commit;
