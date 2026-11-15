-- AURUM LAB: eliminar métricas de demostración que no representan datos reales.
-- Conserva únicamente estadísticas que se alimenten de fuentes verificadas.

BEGIN;

DELETE FROM public.aurum_community_stats
WHERE metric_key IN (
  'workshops',
  'countries',
  'calculations',
  'designs',
  'shared_files'
);

COMMIT;

NOTIFY pgrst, 'reload schema';
