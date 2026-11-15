-- AURUM LAB: métricas públicas calculadas desde registros reales.
-- No usa cifras sembradas ni estimaciones.
BEGIN;

CREATE OR REPLACE FUNCTION public.obtener_metricas_reales_comunidad()
RETURNS TABLE (
  metric_key text,
  label text,
  value bigint,
  prefix text,
  suffix text,
  display_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH talleres AS (
    SELECT ep.id
    FROM public.ecosistema_participantes ep
    WHERE ep.tipo_participante = 'organizacion'
      AND ep.estado = 'activo'
      AND COALESCE(ep.comunidad_visible, true) = true
  ),
  catalogos AS (
    SELECT c.participante_id
    FROM public.catalogo_configuracion c
    JOIN talleres t ON t.id = c.participante_id
    WHERE c.visible = true
  ),
  productos AS (
    SELECT p.id, p.participante_id, p.aurum_render_url
    FROM public.catalogo_productos p
    JOIN catalogos c ON c.participante_id = p.participante_id
    WHERE p.publicado = true
  )
  SELECT 'verified_workshops', 'Talleres activos', COUNT(*)::bigint, NULL::text, NULL::text, 1
  FROM talleres

  UNION ALL

  SELECT 'verified_catalogs', 'Catálogos públicos', COUNT(*)::bigint, NULL::text, NULL::text, 2
  FROM catalogos

  UNION ALL

  SELECT 'verified_designs', 'Diseños publicados', COUNT(*)::bigint, NULL::text, NULL::text, 3
  FROM productos

  UNION ALL

  SELECT 'verified_renders', 'Renders compartidos', COUNT(*)::bigint, NULL::text, NULL::text, 4
  FROM productos
  WHERE NULLIF(BTRIM(COALESCE(aurum_render_url, '')), '') IS NOT NULL

  UNION ALL

  SELECT 'verified_activities', 'Actividades públicas', COUNT(*)::bigint, NULL::text, NULL::text, 5
  FROM public.aurum_community_activity a
  JOIN talleres t ON t.id = a.participante_id
  WHERE a.is_public = true
    AND LOWER(BTRIM(a.actor_name)) <> 'fadilab';
$$;

REVOKE ALL ON FUNCTION public.obtener_metricas_reales_comunidad() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_metricas_reales_comunidad() TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
