-- Standardize every existing and future workshop catalog to the Fadilab master list.
-- Keep custom categories and historical products; hide the legacy "Sortijas" entry
-- instead of deleting it, so existing records are not damaged.
begin;

create or replace function public.catalogo_sembrar_categorias_base()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.catalogo_categorias (participante_id, nombre, slug, orden)
  values
    (new.participante_id, 'Anillos', 'anillos', 10),
    (new.participante_id, 'Aretes', 'aretes', 20),
    (new.participante_id, 'Collares', 'collares', 30),
    (new.participante_id, 'Pulseras', 'pulseras', 40),
    (new.participante_id, 'Dijes', 'dijes', 50),
    (new.participante_id, 'Broches', 'broches', 60),
    (new.participante_id, 'Sets / Conjuntos', 'sets-conjuntos', 80),
    (new.participante_id, 'Otros', 'otros', 90)
  on conflict (participante_id, slug) do nothing;

  return new;
end;
$$;

insert into public.catalogo_categorias (participante_id, nombre, slug, orden)
select c.participante_id, v.nombre, v.slug, v.orden
from public.catalogo_configuracion c
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
) as v(nombre, slug, orden)
on conflict (participante_id, slug) do nothing;

update public.catalogo_categorias
set activo = false
where slug = 'sortijas'
  and activo = true;

notify pgrst, 'reload schema';
commit;
