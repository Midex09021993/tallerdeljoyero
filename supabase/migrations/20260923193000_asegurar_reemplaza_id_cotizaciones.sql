-- Asegura el vínculo entre versiones en instalaciones donde la columna
-- histórica no llegó a aplicarse aunque las funciones de versionado la utilizan.
-- Es idempotente y no modifica ni elimina datos existentes.

alter table public.cotizaciones
  add column if not exists reemplaza_id uuid
  references public.cotizaciones(id)
  on delete set null;

create index if not exists cotizaciones_reemplaza_id_idx
  on public.cotizaciones(reemplaza_id);
