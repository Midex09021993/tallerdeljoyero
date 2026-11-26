-- AURUM Transfer: reserva temporal y atómica durante importaciones a Mi Nube.
-- Aplicar manualmente en Supabase antes de desplegar aurum-transfer-import.
alter table public.aurum_transfers
  add column if not exists import_claimed_at timestamptz;

create index if not exists aurum_transfers_import_claimed_at_idx
  on public.aurum_transfers(import_claimed_at)
  where import_claimed_at is not null;

comment on column public.aurum_transfers.import_claimed_at is
  'Reserva temporal para impedir importaciones concurrentes. Se libera al completar o fallar; reservas abandonadas se recuperan tras 30 minutos.';
