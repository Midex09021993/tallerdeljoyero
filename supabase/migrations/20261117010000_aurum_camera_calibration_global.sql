-- AURUM RENDER: one shared master camera calibration for the whole application.
-- Run manually in Lovable Cloud / Supabase SQL Editor.
create table if not exists public.aurum_camera_calibration_global (
  id smallint primary key default 1 check (id = 1),
  calibration_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint aurum_camera_calibration_global_data_object
    check (jsonb_typeof(calibration_data) = 'object')
);

alter table public.aurum_camera_calibration_global enable row level security;

drop policy if exists "Authenticated users can read AURUM master camera calibration"
  on public.aurum_camera_calibration_global;
create policy "Authenticated users can read AURUM master camera calibration"
  on public.aurum_camera_calibration_global
  for select to authenticated
  using (true);

drop policy if exists "AURUM admins can create master camera calibration"
  on public.aurum_camera_calibration_global;
create policy "AURUM admins can create master camera calibration"
  on public.aurum_camera_calibration_global
  for insert to authenticated
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('dueno', 'gerente')
    )
  );

drop policy if exists "AURUM admins can update master camera calibration"
  on public.aurum_camera_calibration_global;
create policy "AURUM admins can update master camera calibration"
  on public.aurum_camera_calibration_global
  for update to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('dueno', 'gerente')
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('dueno', 'gerente')
    )
  );

grant select, insert, update on public.aurum_camera_calibration_global to authenticated;
