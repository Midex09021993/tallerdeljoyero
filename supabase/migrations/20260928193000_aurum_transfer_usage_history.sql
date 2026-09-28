-- AURUM Transfer: historial administrativo de uso.
-- Registra metadatos operativos, nunca nombres ni contenido de archivos.
create table if not exists public.aurum_transfer_usage (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null unique references public.aurum_transfers(id) on delete cascade,
  created_at timestamptz not null default now(),
  file_count integer not null default 0,
  total_bytes bigint not null default 0,
  status text not null default 'available' check (status in ('available','consumed','expired')),
  consumed_at timestamptz
);

create index if not exists aurum_transfer_usage_created_at_idx
  on public.aurum_transfer_usage(created_at desc);

alter table public.aurum_transfer_usage enable row level security;

revoke all on public.aurum_transfer_usage from anon, authenticated;
grant select on public.aurum_transfer_usage to authenticated;

drop policy if exists "aurum transfer usage owner read" on public.aurum_transfer_usage;
create policy "aurum transfer usage owner read"
on public.aurum_transfer_usage
for select
to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
);

grant all on public.aurum_transfer_usage to service_role;

comment on table public.aurum_transfer_usage is
'Historial administrativo de uso de AURUM Transfer. Solo metadatos: no almacena contenido ni nombres de archivos.';
