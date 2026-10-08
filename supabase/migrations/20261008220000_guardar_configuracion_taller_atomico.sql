-- Guardado atomico de la configuracion del taller.
-- Evita DELETE/INSERT parciales desde el cliente y centraliza la autorizacion por sede.

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

create or replace function public.guardar_configuracion_taller(
  _sede_id uuid,
  _especialidad_ids uuid[] default '{}'::uuid[],
  _produccion_activa boolean default false,
  _servicios_externos_activos boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  if not (
    public.has_role(auth.uid(), 'dueno'::app_role)
    or (
      public.has_role(auth.uid(), 'gerente'::app_role)
      and public.ve_sede(auth.uid(), _sede_id)
    )
  ) then
    raise exception 'No tienes permisos para configurar este taller';
  end if;

  if not exists (
    select 1 from public.sedes where id = _sede_id
  ) then
    raise exception 'La sede seleccionada no existe';
  end if;

  delete from public.sede_especialidades
  where sede_id = _sede_id;

  insert into public.sede_especialidades (sede_id, especialidad_id)
  select _sede_id, x.especialidad_id
  from (
    select distinct unnest(coalesce(_especialidad_ids, '{}'::uuid[])) as especialidad_id
  ) x
  where exists (
    select 1
    from public.especialidades e
    where e.id = x.especialidad_id
      and e.activa = true
  );

  insert into public.sede_modalidades (
    sede_id,
    produccion_activa,
    servicios_externos_activos
  )
  values (
    _sede_id,
    coalesce(_produccion_activa, false),
    coalesce(_servicios_externos_activos, false)
  )
  on conflict (sede_id) do update
  set
    produccion_activa = excluded.produccion_activa,
    servicios_externos_activos = excluded.servicios_externos_activos,
    updated_at = now();

  select count(*)::integer
    into v_total
  from public.sede_especialidades
  where sede_id = _sede_id;

  return jsonb_build_object(
    'ok', true,
    'sede_id', _sede_id,
    'capacidades_guardadas', v_total,
    'produccion_activa', coalesce(_produccion_activa, false),
    'servicios_externos_activos', coalesce(_servicios_externos_activos, false)
  );
end;
$$;

revoke all on function public.guardar_configuracion_taller(uuid, uuid[], boolean, boolean)
from public, anon;

grant execute on function public.guardar_configuracion_taller(uuid, uuid[], boolean, boolean)
to authenticated;

notify pgrst, 'reload schema';
