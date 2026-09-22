-- Conecta los trabajos operativos con el catálogo existente de especialidades.
-- No duplica el ecosistema: Taller sigue siendo el área y la especialidad define la operación.
alter table public.trabajos
  add column if not exists especialidad_id uuid references public.especialidades(id) on delete set null;

create index if not exists trabajos_especialidad_idx
  on public.trabajos(especialidad_id)
  where especialidad_id is not null;

comment on column public.trabajos.especialidad_id is
  'Especialidad concreta de la operación. Para Taller permite distinguir engaste, pulido, acabado, etc.; también puede usarse en otras áreas cuando corresponda.';
