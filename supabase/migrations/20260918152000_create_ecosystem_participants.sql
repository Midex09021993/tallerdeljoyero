-- Ecosystem participant foundation
create table if not exists public.ecosistema_participantes (
  id uuid primary key default gen_random_uuid(),
  tipo_participante text not null check (tipo_participante in ('organizacion','profesional','vendedor','proveedor','servicio','talento','institucion_educativa')),
  nombre text not null,
  razon_social text,
  email text,
  telefono text,
  ciudad text,
  descripcion text,
  estado text not null default 'activo' check (estado in ('activo','pausado','inactivo')),
  notas_owner text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.especialidades (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  categoria text,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.participante_especialidades (
  participante_id uuid not null references public.ecosistema_participantes(id) on delete cascade,
  especialidad_id uuid not null references public.especialidades(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (participante_id, especialidad_id)
);

create table if not exists public.participante_cuentas (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.ecosistema_participantes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  relacion text not null default 'principal' check (relacion in ('principal','miembro','contacto')),
  estado text not null default 'activo' check (estado in ('activo','revocado')),
  created_at timestamptz not null default now(),
  unique (participante_id, user_id)
);

alter table public.solicitudes_acceso add column if not exists participante_id uuid references public.ecosistema_participantes(id) on delete set null;

create index if not exists ecosistema_participantes_tipo_idx on public.ecosistema_participantes(tipo_participante);
create index if not exists ecosistema_participantes_estado_idx on public.ecosistema_participantes(estado);
create index if not exists participante_especialidades_especialidad_idx on public.participante_especialidades(especialidad_id);
create index if not exists participante_cuentas_user_idx on public.participante_cuentas(user_id);
create index if not exists solicitudes_acceso_participante_idx on public.solicitudes_acceso(participante_id);

alter table public.ecosistema_participantes enable row level security;
alter table public.especialidades enable row level security;
alter table public.participante_especialidades enable row level security;
alter table public.participante_cuentas enable row level security;

drop policy if exists "owner_manage_ecosistema_participantes" on public.ecosistema_participantes;
drop policy if exists "account_read_own_participant_profile" on public.ecosistema_participantes;
drop policy if exists "owner_write_ecosistema_participantes" on public.ecosistema_participantes;
drop policy if exists "owner_update_ecosistema_participantes" on public.ecosistema_participantes;
drop policy if exists "owner_delete_ecosistema_participantes" on public.ecosistema_participantes;
drop policy if exists "read_ecosistema_participantes" on public.ecosistema_participantes;
create policy "owner_write_ecosistema_participantes" on public.ecosistema_participantes for insert to authenticated with check ((select public.has_role((select auth.uid()), 'dueno'::app_role)));
create policy "owner_update_ecosistema_participantes" on public.ecosistema_participantes for update to authenticated using ((select public.has_role((select auth.uid()), 'dueno'::app_role))) with check ((select public.has_role((select auth.uid()), 'dueno'::app_role)));
create policy "owner_delete_ecosistema_participantes" on public.ecosistema_participantes for delete to authenticated using ((select public.has_role((select auth.uid()), 'dueno'::app_role)));
create policy "read_ecosistema_participantes" on public.ecosistema_participantes for select to authenticated using ((select public.has_role((select auth.uid()), 'dueno'::app_role)) or exists (select 1 from public.participante_cuentas pc where pc.participante_id = ecosistema_participantes.id and pc.user_id = (select auth.uid()) and pc.estado='activo'));

drop policy if exists "owner_manage_especialidades" on public.especialidades;
drop policy if exists "owner_write_especialidades" on public.especialidades;
drop policy if exists "owner_update_especialidades" on public.especialidades;
drop policy if exists "owner_delete_especialidades" on public.especialidades;
drop policy if exists "owner_read_especialidades" on public.especialidades;
create policy "owner_write_especialidades" on public.especialidades for insert to authenticated with check ((select public.has_role((select auth.uid()), 'dueno'::app_role)));
create policy "owner_update_especialidades" on public.especialidades for update to authenticated using ((select public.has_role((select auth.uid()), 'dueno'::app_role))) with check ((select public.has_role((select auth.uid()), 'dueno'::app_role)));
create policy "owner_delete_especialidades" on public.especialidades for delete to authenticated using ((select public.has_role((select auth.uid()), 'dueno'::app_role)));
create policy "owner_read_especialidades" on public.especialidades for select to authenticated using ((select public.has_role((select auth.uid()), 'dueno'::app_role)));

drop policy if exists "owner_manage_participante_especialidades" on public.participante_especialidades;
drop policy if exists "owner_write_participante_especialidades" on public.participante_especialidades;
drop policy if exists "owner_update_participante_especialidades" on public.participante_especialidades;
drop policy if exists "owner_delete_participante_especialidades" on public.participante_especialidades;
drop policy if exists "owner_read_participante_especialidades" on public.participante_especialidades;
create policy "owner_write_participante_especialidades" on public.participante_especialidades for insert to authenticated with check ((select public.has_role((select auth.uid()), 'dueno'::app_role)));
create policy "owner_update_participante_especialidades" on public.participante_especialidades for update to authenticated using ((select public.has_role((select auth.uid()), 'dueno'::app_role))) with check ((select public.has_role((select auth.uid()), 'dueno'::app_role)));
create policy "owner_delete_participante_especialidades" on public.participante_especialidades for delete to authenticated using ((select public.has_role((select auth.uid()), 'dueno'::app_role)));
create policy "owner_read_participante_especialidades" on public.participante_especialidades for select to authenticated using ((select public.has_role((select auth.uid()), 'dueno'::app_role)));

drop policy if exists "owner_manage_participante_cuentas" on public.participante_cuentas;
drop policy if exists "account_read_own_participant" on public.participante_cuentas;
drop policy if exists "read_participante_cuentas" on public.participante_cuentas;
drop policy if exists "owner_write_participante_cuentas" on public.participante_cuentas;
drop policy if exists "owner_update_participante_cuentas" on public.participante_cuentas;
drop policy if exists "owner_delete_participante_cuentas" on public.participante_cuentas;
create policy "owner_write_participante_cuentas" on public.participante_cuentas for insert to authenticated with check ((select public.has_role((select auth.uid()), 'dueno'::app_role)));
create policy "owner_update_participante_cuentas" on public.participante_cuentas for update to authenticated using ((select public.has_role((select auth.uid()), 'dueno'::app_role))) with check ((select public.has_role((select auth.uid()), 'dueno'::app_role)));
create policy "owner_delete_participante_cuentas" on public.participante_cuentas for delete to authenticated using ((select public.has_role((select auth.uid()), 'dueno'::app_role)));
create policy "read_participante_cuentas" on public.participante_cuentas for select to authenticated using ((select public.has_role((select auth.uid()), 'dueno'::app_role)) or ((select auth.uid())=user_id));

create or replace function public.touch_ecosistema_participantes()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_touch_ecosistema_participantes on public.ecosistema_participantes;
create trigger trg_touch_ecosistema_participantes before update on public.ecosistema_participantes
for each row execute function public.touch_ecosistema_participantes();

grant select, insert, update, delete on public.ecosistema_participantes to authenticated;
grant select, insert, update, delete on public.especialidades to authenticated;
grant select, insert, update, delete on public.participante_especialidades to authenticated;
grant select, insert, update, delete on public.participante_cuentas to authenticated;