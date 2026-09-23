-- Capacidades internas por sede/taller.
-- El Dueño define el catálogo de especialidades; cada Gerente/admin de sede
-- decide cuáles de esas capacidades ofrece su propio taller.

create table if not exists public.sede_especialidades (
  sede_id uuid not null references public.sedes(id) on delete cascade,
  especialidad_id uuid not null references public.especialidades(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (sede_id, especialidad_id)
);

create index if not exists sede_especialidades_especialidad_idx
  on public.sede_especialidades(especialidad_id);

alter table public.sede_especialidades enable row level security;

drop policy if exists "sede_especialidades_select" on public.sede_especialidades;
create policy "sede_especialidades_select"
on public.sede_especialidades
for select to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::app_role)
  or public.ve_sede((select auth.uid()), sede_id)
);

drop policy if exists "sede_especialidades_insert" on public.sede_especialidades;
create policy "sede_especialidades_insert"
on public.sede_especialidades
for insert to authenticated
with check (
  public.has_role((select auth.uid()), 'dueno'::app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
);

drop policy if exists "sede_especialidades_delete" on public.sede_especialidades;
create policy "sede_especialidades_delete"
on public.sede_especialidades
for delete to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
);

grant select, insert, delete on public.sede_especialidades to authenticated;

-- Catálogo inicial de capacidades de producción. No activa ninguna capacidad
-- en una sede: el administrador debe seleccionarlas explícitamente.
insert into public.especialidades (nombre, categoria, activa)
select x.nombre, 'Producción', true
from (values
  ('Diseño 3D'),
  ('Impresión 3D'),
  ('Casting'),
  ('Corte Láser'),
  ('Taller'),
  ('Engaste'),
  ('Pulido'),
  ('Grabado'),
  ('Fotografía'),
  ('Gemología')
) as x(nombre)
where not exists (
  select 1 from public.especialidades e where lower(trim(e.nombre)) = lower(trim(x.nombre))
);

-- El catálogo es administrado por el Dueño, pero los gerentes necesitan
-- consultarlo para configurar las capacidades internas de su propia sede.
drop policy if exists "owner_read_especialidades" on public.especialidades;
create policy "owner_or_manager_read_especialidades"
on public.especialidades
for select to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::app_role)
  or public.has_role((select auth.uid()), 'gerente'::app_role)
);
