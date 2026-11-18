-- Catálogo profesional v1.1: categorías administrables por taller.
begin;

create table if not exists public.catalogo_categorias (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.ecosistema_participantes(id) on delete cascade,
  nombre text not null,
  slug text not null,
  orden integer not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogo_categorias_nombre_chk check (length(trim(nombre)) between 2 and 80),
  constraint catalogo_categorias_slug_chk check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint catalogo_categorias_participante_slug_uq unique (participante_id, slug),
  constraint catalogo_categorias_participante_nombre_uq unique (participante_id, nombre)
);

create index if not exists catalogo_categorias_participante_orden_idx
  on public.catalogo_categorias(participante_id, orden, nombre);

alter table public.catalogo_categorias enable row level security;

drop policy if exists catalogo_categorias_select on public.catalogo_categorias;
create policy catalogo_categorias_select
on public.catalogo_categorias
for select
to authenticated
using (public.tiene_participante(auth.uid(), participante_id));

drop policy if exists catalogo_categorias_write on public.catalogo_categorias;
create policy catalogo_categorias_write
on public.catalogo_categorias
for all
to authenticated
using (public.es_admin(auth.uid()) and public.tiene_participante(auth.uid(), participante_id))
with check (public.es_admin(auth.uid()) and public.tiene_participante(auth.uid(), participante_id));

create or replace function public.catalogo_categorias_slug()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.nombre := trim(new.nombre);
  new.slug := public.catalogo_normalizar_slug(new.nombre);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists catalogo_categorias_slug_trg on public.catalogo_categorias;
create trigger catalogo_categorias_slug_trg
before insert or update of nombre
on public.catalogo_categorias
for each row execute function public.catalogo_categorias_slug();

-- Categorías base para cada taller que ya tiene catálogo.
insert into public.catalogo_categorias (participante_id, nombre, slug, orden)
select c.participante_id, v.nombre, public.catalogo_normalizar_slug(v.nombre), v.orden
from public.catalogo_configuracion c
cross join (
  values
    ('Anillos', 10),
    ('Aretes', 20),
    ('Collares', 30),
    ('Pulseras', 40),
    ('Dijes', 50),
    ('Broches', 60),
    ('Sortijas', 70),
    ('Sets / Conjuntos', 80),
    ('Otros', 90)
) v(nombre, orden)
on conflict (participante_id, slug) do nothing;

-- Corrige únicamente categorías vacías o heredadas como "Sin categoría".
update public.catalogo_productos
set categoria = 'Otros'
where categoria is null
   or trim(categoria) = ''
   or lower(trim(categoria)) = 'sin categoría';

notify pgrst, 'reload schema';
commit;