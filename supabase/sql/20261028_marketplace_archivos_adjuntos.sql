-- Soporte para publicaciones que incluyen uno o varios archivos de Mi Nube.
-- Ejecutar manualmente en SQL Editor de Lovable Cloud antes de usar la publicación múltiple.
begin;

alter table public.archivos_digitales_marketplace
  add column if not exists archivos_adjuntos jsonb not null default '[]'::jsonb;

alter table public.archivos_digitales_marketplace
  drop constraint if exists archivos_digitales_adjuntos_array_check;

alter table public.archivos_digitales_marketplace
  add constraint archivos_digitales_adjuntos_array_check
  check (jsonb_typeof(archivos_adjuntos) = 'array');

comment on column public.archivos_digitales_marketplace.archivos_adjuntos is
  'Archivos adicionales incluidos en una publicación; cada objeto contiene ruta, nombre y bytes. La ruta principal sigue en ruta_archivo para compatibilidad.';

notify pgrst, 'reload schema';
commit;

-- Verificación
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'archivos_digitales_marketplace'
  and column_name = 'archivos_adjuntos';
