-- AURUM LAB: public community activity feed and editable community metrics.
-- Apply manually in Lovable Cloud / Supabase SQL editor.
create table if not exists public.aurum_community_activity (
  id uuid primary key default gen_random_uuid(),
  actor_name text not null check (char_length(actor_name) between 1 and 120),
  activity_type text not null check (activity_type in ('publication','catalog','registration','render','achievement','milestone')),
  title text not null check (char_length(title) between 1 and 240),
  summary text,
  created_at timestamptz not null default now(),
  is_public boolean not null default false,
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists aurum_community_activity_public_created_idx
  on public.aurum_community_activity (created_at desc)
  where is_public = true;

alter table public.aurum_community_activity enable row level security;
grant select on public.aurum_community_activity to anon, authenticated;

drop policy if exists "Public can read published community activity" on public.aurum_community_activity;
create policy "Public can read published community activity"
  on public.aurum_community_activity
  for select
  to anon, authenticated
  using (is_public = true);

create table if not exists public.aurum_community_stats (
  metric_key text primary key,
  label text not null,
  value bigint not null default 0 check (value >= 0),
  prefix text,
  suffix text,
  display_order integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.aurum_community_stats enable row level security;
grant select on public.aurum_community_stats to anon, authenticated;

drop policy if exists "Public can read community stats" on public.aurum_community_stats;
create policy "Public can read community stats"
  on public.aurum_community_stats
  for select
  to anon, authenticated
  using (true);

insert into public.aurum_community_stats (metric_key, label, value, prefix, display_order)
values
  ('workshops', 'Talleres registrados', 120, '+', 1),
  ('countries', 'Países representados', 8, '+', 2),
  ('calculations', 'Cálculos realizados', 15000, '+', 3),
  ('designs', 'Diseños almacenados', 500, '+', 4),
  ('shared_files', 'Archivos compartidos', 2000, '+', 5)
on conflict (metric_key) do nothing;

-- Activity rows are intentionally not seeded: the public feed must contain real,
-- reviewed events only. The UI shows clearly labelled preview content until then.
-- Inserts/updates should be performed by trusted server-side functions or admins.
