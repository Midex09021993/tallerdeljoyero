-- AURUM RENDER: global camera calibration per authenticated account.
-- Run manually in Lovable Cloud / Supabase SQL Editor.
create table if not exists public.aurum_camera_calibrations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  calibration_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint aurum_camera_calibrations_data_object
    check (jsonb_typeof(calibration_data) = 'object')
);

alter table public.aurum_camera_calibrations enable row level security;

drop policy if exists "Users can read their own AURUM camera calibration"
  on public.aurum_camera_calibrations;
create policy "Users can read their own AURUM camera calibration"
  on public.aurum_camera_calibrations
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own AURUM camera calibration"
  on public.aurum_camera_calibrations;
create policy "Users can insert their own AURUM camera calibration"
  on public.aurum_camera_calibrations
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own AURUM camera calibration"
  on public.aurum_camera_calibrations;
create policy "Users can update their own AURUM camera calibration"
  on public.aurum_camera_calibrations
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.aurum_camera_calibrations to authenticated;
