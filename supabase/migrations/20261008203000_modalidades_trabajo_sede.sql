-- Modalidades de trabajo configurables por sede.
-- Producción y Servicios externos son modalidades independientes de las capacidades.
-- Las capacidades productivas siguen definiendo qué procesos son internos.

create table if not exists public.sede_modalidades (
  sede_id uuid primary key references public.sedes(id) on delete cascade,
  produccion_activa boolean not null default false,
  servicios_externos_activos boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.sede_modalidades to authenticated;
grant all on public.sede_modalidades to service_role;
alter table public.sede_modalidades enable row level security;

drop policy if exists "sede_modalidades_select" on public.sede_modalidades;
create policy "sede_modalidades_select"
on public.sede_modalidades
for select to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::app_role)
  or public.ve_sede((select auth.uid()), sede_id)
);

drop policy if exists "sede_modalidades_insert" on public.sede_modalidades;
create policy "sede_modalidades_insert"
on public.sede_modalidades
for insert to authenticated
with check (
  public.has_role((select auth.uid()), 'dueno'::app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
);

drop policy if exists "sede_modalidades_update" on public.sede_modalidades;
create policy "sede_modalidades_update"
on public.sede_modalidades
for update to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
)
with check (
  public.has_role((select auth.uid()), 'dueno'::app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
);

drop policy if exists "sede_modalidades_delete" on public.sede_modalidades;
create policy "sede_modalidades_delete"
on public.sede_modalidades
for delete to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
);

-- Todas las sedes actuales conservan el comportamiento que ya tenían:
-- Producción queda activa si la sede ya tenía al menos una capacidad productiva.
-- Servicios externos queda activo para no romper operaciones existentes.
insert into public.sede_modalidades (sede_id, produccion_activa, servicios_externos_activos)
select
  s.id,
  exists (
    select 1
    from public.sede_especialidades se
    join public.especialidades e on e.id = se.especialidad_id
    where se.sede_id = s.id
      and e.categoria = 'Producción'
      and e.nombre in ('Diseño 3D','Impresión 3D','Casting','Corte Láser','Taller')
  ),
  true
from public.sedes s
on conflict (sede_id) do nothing;

-- Toda sede nueva nace con ambas modalidades desactivadas.
create or replace function public.crear_modalidades_sede()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.sede_modalidades (sede_id)
  values (new.id)
  on conflict (sede_id) do nothing;
  return new;
end;
$$;

drop trigger if exists sedes_crear_modalidades on public.sedes;
create trigger sedes_crear_modalidades
after insert on public.sedes
for each row execute function public.crear_modalidades_sede();

drop trigger if exists sede_modalidades_updated_at on public.sede_modalidades;
create trigger sede_modalidades_updated_at
before update on public.sede_modalidades
for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
