-- Sincroniza la estructura mínima que usa el flujo de cotizaciones.
-- Es idempotente para poder ejecutarse aunque alguna columna ya exista.
alter table public.cotizacion_detalles
  add column if not exists metadata jsonb
  not null
  default '{}'::jsonb;

alter table public.cotizacion_detalles
  add column if not exists updated_at timestamptz
  not null
  default now();
