-- Analítica pública mínima de Aurum Lab.
-- Solo registra eventos agregados de producto; no guarda IP, usuario, correo ni contenido de archivos.
create table if not exists public.aurum_analytics_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_name text not null check (
    event_name in (
      'page_view',
      'tool_opened',
      'render_opened',
      'catalog_opened',
      'product_viewed',
      'whatsapp_clicked',
      'access_request_started',
      'access_request_submitted',
      'login_started',
      'login_completed'
    )
  ),
  session_id text not null check (char_length(session_id) between 16 and 128),
  path text not null check (char_length(path) between 1 and 500),
  referrer text,
  metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(metadata) = 'object'
    and octet_length(metadata::text) <= 4000
  )
);

create index if not exists aurum_analytics_events_created_at_idx
  on public.aurum_analytics_events (created_at desc);

create index if not exists aurum_analytics_events_event_name_idx
  on public.aurum_analytics_events (event_name, created_at desc);

alter table public.aurum_analytics_events enable row level security;

drop policy if exists "Public can record Aurum analytics" on public.aurum_analytics_events;

create policy "Public can record Aurum analytics"
on public.aurum_analytics_events
for insert
to anon, authenticated
with check (
  char_length(session_id) between 16 and 128
  and char_length(path) between 1 and 500
  and jsonb_typeof(metadata) = 'object'
  and octet_length(metadata::text) <= 4000
);

revoke select, update, delete on public.aurum_analytics_events from anon, authenticated;
grant insert on public.aurum_analytics_events to anon, authenticated;

comment on table public.aurum_analytics_events is
'Aurum Lab public funnel analytics. No IP, identity or file content is stored.';
