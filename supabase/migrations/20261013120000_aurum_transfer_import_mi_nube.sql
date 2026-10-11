-- AURUM Transfer -> Mi Nube: importación autenticada, única y temporal.
begin;

alter table public.aurum_transfers
  add column if not exists imported_at timestamptz,
  add column if not exists imported_by uuid references auth.users(id) on delete set null;

comment on column public.aurum_transfers.imported_at is
  'Momento en que el receptor autenticado importó la transferencia a Mi Nube. Una sola importación por transferencia.';
comment on column public.aurum_transfers.imported_by is
  'Cuenta autenticada que importó los archivos a su Mi Nube.';

commit;
