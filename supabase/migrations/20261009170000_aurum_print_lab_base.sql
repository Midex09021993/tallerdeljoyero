-- Aurum Print Lab: esquema base con aislamiento por participante_id.
-- Propuesta para revisión en staging. No ejecutar en producción sin pruebas RLS.
begin;

create table if not exists public.print_devices (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.ecosistema_participantes(id) on delete cascade,
  fabricante text not null,
  modelo text not null,
  tecnologia text not null default 'msla' check (tecnologia in ('msla','dlp','sla','other')),
  resolucion_x integer check (resolucion_x is null or resolucion_x > 0),
  resolucion_y integer check (resolucion_y is null or resolucion_y > 0),
  volumen_construccion jsonb not null default '{}'::jsonb,
  notas text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participante_id, fabricante, modelo),
  unique (id, participante_id)
);

create table if not exists public.print_resins (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.ecosistema_participantes(id) on delete cascade,
  fabricante text not null,
  producto text not null,
  color text,
  tipo text not null default 'castable',
  uso_previsto text not null default 'joyeria',
  fuente_url text,
  licencia_fuente text,
  notas text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participante_id, fabricante, producto, color),
  unique (id, participante_id)
);

create table if not exists public.print_profiles (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.ecosistema_participantes(id) on delete cascade,
  device_id uuid not null,
  resin_id uuid not null,
  nombre text not null,
  slicer text not null check (slicer in ('chitubox','lychee','voxeldance_tango','other')),
  slicer_version text,
  visibilidad text not null default 'private' check (visibilidad in ('private','community')),
  estado text not null default 'draft' check (estado in ('draft','published','archived')),
  tipo_fuente text not null default 'user' check (tipo_fuente in ('official','community','authorized_import','user')),
  fuente_url text,
  licencia_fuente text,
  atribucion text,
  descripcion text,
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, participante_id),
  foreign key (device_id, participante_id) references public.print_devices(id, participante_id) on delete restrict,
  foreign key (resin_id, participante_id) references public.print_resins(id, participante_id) on delete restrict
);

create table if not exists public.print_profile_revisions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.print_profiles(id) on delete cascade,
  revision integer not null check (revision > 0),
  parametros jsonb not null default '{}'::jsonb,
  slicer_version text,
  archivo_original_path text,
  notas_cambios text,
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (profile_id, revision)
);

create table if not exists public.print_calibration_runs (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.ecosistema_participantes(id) on delete cascade,
  profile_id uuid not null,
  revision_id uuid references public.print_profile_revisions(id) on delete set null,
  resultado text not null check (resultado in ('success','partial','failed')),
  parametros_probados jsonb not null default '{}'::jsonb,
  defectos text[] not null default '{}',
  notas text,
  evidencia_path text,
  probado_por uuid references auth.users(id) on delete set null,
  probado_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (profile_id, participante_id) references public.print_profiles(id, participante_id) on delete cascade
);

create table if not exists public.print_profile_feedback (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.ecosistema_participantes(id) on delete cascade,
  profile_id uuid not null,
  valoracion smallint check (valoracion between 1 and 5),
  resultado_prueba text check (resultado_prueba in ('success','partial','failed')),
  comentario text,
  reportado boolean not null default false,
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participante_id, profile_id),
  foreign key (profile_id) references public.print_profiles(id) on delete cascade
);

create index if not exists print_devices_participante_idx on public.print_devices(participante_id);
create index if not exists print_resins_participante_idx on public.print_resins(participante_id);
create index if not exists print_profiles_participante_idx on public.print_profiles(participante_id);
create index if not exists print_profiles_public_idx on public.print_profiles(slicer, estado, visibilidad);
create index if not exists print_revisions_profile_idx on public.print_profile_revisions(profile_id, revision desc);
create index if not exists print_runs_profile_idx on public.print_calibration_runs(profile_id, probado_at desc);
create index if not exists print_feedback_profile_idx on public.print_profile_feedback(profile_id);

alter table public.print_devices enable row level security;
alter table public.print_resins enable row level security;
alter table public.print_profiles enable row level security;
alter table public.print_profile_revisions enable row level security;
alter table public.print_calibration_runs enable row level security;
alter table public.print_profile_feedback enable row level security;

-- updated_at debe actualizarse en la base, no depender de que cada pantalla lo recuerde.
create or replace function public.print_lab_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_print_devices_updated_at on public.print_devices;
create trigger trg_print_devices_updated_at before update on public.print_devices
for each row execute function public.print_lab_touch_updated_at();
drop trigger if exists trg_print_resins_updated_at on public.print_resins;
create trigger trg_print_resins_updated_at before update on public.print_resins
for each row execute function public.print_lab_touch_updated_at();
drop trigger if exists trg_print_profiles_updated_at on public.print_profiles;
create trigger trg_print_profiles_updated_at before update on public.print_profiles
for each row execute function public.print_lab_touch_updated_at();
drop trigger if exists trg_print_feedback_updated_at on public.print_profile_feedback;
create trigger trg_print_feedback_updated_at before update on public.print_profile_feedback
for each row execute function public.print_lab_touch_updated_at();


-- Helpers SECURITY DEFINER: las políticas públicas no deben exigir SELECT anon
-- sobre tablas internas de cuentas/participantes para comprobar pertenencia.
create or replace function public.print_lab_can_access_participant(
  _participante_id uuid,
  _write boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $
  select coalesce(public.has_role((select auth.uid()), 'dueno'::public.app_role), false)
    or exists (
      select 1
      from public.participante_cuentas pc
      join public.ecosistema_participantes ep on ep.id = pc.participante_id
      where pc.user_id = (select auth.uid())
        and pc.participante_id = _participante_id
        and pc.estado = 'activo'
        and ep.estado = 'activo'
        and (not _write or pc.relacion in ('principal','miembro'))
    );
$;

create or replace function public.print_lab_can_access_storage_path(
  _object_name text,
  _write boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $
  select coalesce(public.has_role((select auth.uid()), 'dueno'::public.app_role), false)
    or exists (
      select 1
      from public.participante_cuentas pc
      join public.ecosistema_participantes ep on ep.id = pc.participante_id
      where pc.user_id = (select auth.uid())
        and pc.participante_id::text = split_part(_object_name, '/', 1)
        and pc.estado = 'activo'
        and ep.estado = 'activo'
        and (not _write or pc.relacion in ('principal','miembro'))
    );
$;

create or replace function public.print_lab_can_access_profile(
  _profile_id uuid,
  _write boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $
  select exists (
    select 1
    from public.print_profiles p
    where p.id = _profile_id
      and (
        (not _write and p.estado = 'published' and p.visibilidad = 'community')
        or public.print_lab_can_access_participant(p.participante_id, _write)
      )
  );
$;

revoke all on function public.print_lab_can_access_participant(uuid, boolean) from public;
revoke all on function public.print_lab_can_access_storage_path(text, boolean) from public;
revoke all on function public.print_lab_can_access_profile(uuid, boolean) from public;
grant execute on function public.print_lab_can_access_participant(uuid, boolean) to anon, authenticated;
grant execute on function public.print_lab_can_access_storage_path(text, boolean) to authenticated;
grant execute on function public.print_lab_can_access_profile(uuid, boolean) to anon, authenticated;

-- Sustituir políticas iniciales por versiones que no consultan tablas internas
-- directamente como anon y que separan lectura pública de escritura del taller.
drop policy if exists print_devices_select on public.print_devices;
create policy print_devices_select on public.print_devices for select to anon, authenticated using (
  public.print_lab_can_access_participant(participante_id, false)
  or exists (
    select 1 from public.print_profiles p
    where p.device_id = print_devices.id
      and p.estado = 'published' and p.visibilidad = 'community'
  )
);
drop policy if exists print_devices_write on public.print_devices;
create policy print_devices_write on public.print_devices for all to authenticated
using (public.print_lab_can_access_participant(participante_id, true))
with check (public.print_lab_can_access_participant(participante_id, true));

drop policy if exists print_resins_select on public.print_resins;
create policy print_resins_select on public.print_resins for select to anon, authenticated using (
  public.print_lab_can_access_participant(participante_id, false)
  or exists (
    select 1 from public.print_profiles p
    where p.resin_id = print_resins.id
      and p.estado = 'published' and p.visibilidad = 'community'
  )
);
drop policy if exists print_resins_write on public.print_resins;
create policy print_resins_write on public.print_resins for all to authenticated
using (public.print_lab_can_access_participant(participante_id, true))
with check (public.print_lab_can_access_participant(participante_id, true));

drop policy if exists print_profiles_select on public.print_profiles;
create policy print_profiles_select on public.print_profiles for select to anon, authenticated using (
  public.print_lab_can_access_profile(id, false)
);
drop policy if exists print_profiles_write on public.print_profiles;
create policy print_profiles_write on public.print_profiles for all to authenticated
using (public.print_lab_can_access_profile(id, true))
with check (public.print_lab_can_access_participant(participante_id, true));

drop policy if exists print_revisions_select on public.print_profile_revisions;
create policy print_revisions_select on public.print_profile_revisions for select to anon, authenticated using (
  public.print_lab_can_access_profile(profile_id, false)
);
drop policy if exists print_revisions_write on public.print_profile_revisions;
create policy print_revisions_write on public.print_profile_revisions for all to authenticated
using (public.print_lab_can_access_profile(profile_id, true))
with check (public.print_lab_can_access_profile(profile_id, true));

drop policy if exists print_runs_select on public.print_calibration_runs;
create policy print_runs_select on public.print_calibration_runs for select to authenticated using (
  public.print_lab_can_access_participant(participante_id, false)
);
drop policy if exists print_runs_write on public.print_calibration_runs;
create policy print_runs_write on public.print_calibration_runs for all to authenticated
using (public.print_lab_can_access_participant(participante_id, true))
with check (public.print_lab_can_access_participant(participante_id, true));

drop policy if exists print_feedback_select on public.print_profile_feedback;
create policy print_feedback_select on public.print_profile_feedback for select to authenticated using (
  public.print_lab_can_access_participant(participante_id, false)
);
drop policy if exists print_feedback_write on public.print_profile_feedback;
create policy print_feedback_write on public.print_profile_feedback for all to authenticated
using (public.print_lab_can_access_participant(participante_id, true))
with check (
  public.print_lab_can_access_participant(participante_id, true)
  and exists (
    select 1 from public.print_profiles p
    where p.id = print_profile_feedback.profile_id
      and p.estado = 'published' and p.visibilidad = 'community'
  )
);

drop policy if exists print_lab_storage_read_owner on storage.objects;
create policy print_lab_storage_read_owner on storage.objects for select to authenticated using (
  bucket_id = 'aurum-print-lab'
  and public.print_lab_can_access_storage_path(name, false)
);
drop policy if exists print_lab_storage_insert_owner on storage.objects;
create policy print_lab_storage_insert_owner on storage.objects for insert to authenticated with check (
  bucket_id = 'aurum-print-lab'
  and public.print_lab_can_access_storage_path(name, true)
);
drop policy if exists print_lab_storage_update_owner on storage.objects;
create policy print_lab_storage_update_owner on storage.objects for update to authenticated using (
  bucket_id = 'aurum-print-lab'
  and public.print_lab_can_access_storage_path(name, true)
) with check (
  bucket_id = 'aurum-print-lab'
  and public.print_lab_can_access_storage_path(name, true)
);
drop policy if exists print_lab_storage_delete_owner on storage.objects;
create policy print_lab_storage_delete_owner on storage.objects for delete to authenticated using (
  bucket_id = 'aurum-print-lab'
  and public.print_lab_can_access_storage_path(name, true)
);


-- Privilegios mínimos públicos. Las tablas internas no quedan abiertas en bloque a anon.
revoke all on public.print_devices, public.print_resins, public.print_profiles,
  public.print_profile_revisions, public.print_calibration_runs, public.print_profile_feedback from anon;
grant select (id, fabricante, modelo, tecnologia, resolucion_x, resolucion_y, volumen_construccion, activo)
  on public.print_devices to anon;
grant select (id, fabricante, producto, color, tipo, uso_previsto, activo)
  on public.print_resins to anon;
grant select (id, device_id, resin_id, nombre, slicer, slicer_version, visibilidad, estado,
  tipo_fuente, fuente_url, licencia_fuente, atribucion, descripcion, created_at, updated_at)
  on public.print_profiles to anon;
grant select (id, profile_id, revision, parametros, slicer_version, notas_cambios, created_at)
  on public.print_profile_revisions to anon;

grant select, insert, update, delete on public.print_devices, public.print_resins,
  public.print_profiles, public.print_profile_revisions, public.print_calibration_runs,
  public.print_profile_feedback to authenticated;

-- Almacenamiento privado, independiente de Aurum Transfer. La ruta debe ser
-- <participante_id>/<archivo>; solo dueño o miembros activos acceden.
insert into storage.buckets (id, name, public, file_size_limit)
values ('aurum-print-lab','aurum-print-lab',false,52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;


commit;
notify pgrst, 'reload schema';