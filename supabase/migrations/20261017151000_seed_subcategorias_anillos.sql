-- Seed useful ring subcategories for catalogs that already have the Anillos category.
begin;

insert into public.catalogo_categorias (participante_id, nombre, slug, parent_id, orden, activo)
select parent.participante_id, child.nombre, parent.slug || '-' || public.catalogo_normalizar_slug(child.nombre), parent.id, child.orden, true
from public.catalogo_categorias parent
cross join (
  values
    ('Compromiso', 10),
    ('Promesa', 20),
    ('Matrimonio y alianzas', 30),
    ('Solitarios y piedras', 40),
    ('Hombre', 50),
    ('Diseño y fantasía', 60),
    ('Otros anillos', 70)
) as child(nombre, orden)
where parent.parent_id is null
  and lower(trim(parent.nombre)) = 'anillos'
on conflict (participante_id, slug) do nothing;

notify pgrst, 'reload schema';
commit;
