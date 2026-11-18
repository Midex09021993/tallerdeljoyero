-- Aurum Lab: instrumentación fiable de registro, autenticación y contacto comercial.
-- Aplicar manualmente en Supabase/Lovable Cloud antes de desplegar el código.
-- No cambia RLS, permisos, tablas de usuarios ni datos personales.

ALTER TABLE public.aurum_analytics_events
  DROP CONSTRAINT IF EXISTS aurum_analytics_events_event_name_funnel_check;

ALTER TABLE public.aurum_analytics_events
  ADD CONSTRAINT aurum_analytics_events_event_name_funnel_check
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
      'login_completed',
      'login_failed',
      'registration_started',
      'registration_completed',
      'registration_failed',
      'contact_started',
      'contact_submitted'
    )
  );

COMMENT ON CONSTRAINT aurum_analytics_events_event_name_funnel_check
ON public.aurum_analytics_events
IS 'Eventos permitidos para medir visitas, herramientas, registro, autenticación y contacto comercial de Aurum Lab.';
