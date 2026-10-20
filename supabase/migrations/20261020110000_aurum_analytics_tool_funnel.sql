-- Aurum Lab: eventos de inicio y finalización de herramientas.
-- Aplicar manualmente en Supabase si las migraciones no se ejecutan automáticamente.
-- No cambia RLS ni permisos; amplía únicamente los nombres de evento permitidos.

ALTER TABLE public.aurum_analytics_events
  DROP CONSTRAINT IF EXISTS aurum_analytics_events_event_name_check;

ALTER TABLE public.aurum_analytics_events
  ADD CONSTRAINT aurum_analytics_events_event_name_check
  CHECK (
    event_name IN (
      'page_view',
      'tool_opened',
      'tool_started',
      'tool_completed',
      'render_opened',
      'platform_opened',
      'catalog_opened',
      'product_viewed',
      'whatsapp_clicked',
      'access_request_started',
      'access_request_submitted',
      'login_started',
      'login_completed'
    )
  );

COMMENT ON CONSTRAINT aurum_analytics_events_event_name_check
ON public.aurum_analytics_events
IS 'Eventos permitidos para la analítica agregada de Aurum Lab.';
