-- Completa el historial de AURUM Transfer con la expiración del enlace.
alter table public.aurum_transfer_usage
  add column if not exists expires_at timestamptz;

update public.aurum_transfer_usage u
set expires_at = t.expires_at
from public.aurum_transfers t
where t.id = u.transfer_id
  and u.expires_at is null;

create index if not exists aurum_transfer_usage_expires_at_idx
  on public.aurum_transfer_usage(expires_at);
