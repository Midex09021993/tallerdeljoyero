ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS a_cuenta numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.trabajos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  area text NOT NULL DEFAULT '',
  ubicacion text NOT NULL DEFAULT '',
  titulo text NOT NULL DEFAULT '',
  descripcion text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'pendiente',
  prioridad text NOT NULL DEFAULT 'normal',
  tipo text NOT NULL DEFAULT 'interno',
  fecha_planificada date,
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  notas text NOT NULL DEFAULT '',
  responsable_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trabajo_archivos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trabajo_id uuid NOT NULL REFERENCES public.trabajos(id) ON DELETE CASCADE,
  pedido_archivo_id uuid NOT NULL REFERENCES public.pedido_archivos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trabajo_id, pedido_archivo_id)
);

CREATE TABLE IF NOT EXISTS public.incidencias_trabajo (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trabajo_id uuid NOT NULL REFERENCES public.trabajos(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'general',
  descripcion text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'abierta',
  resolucion text,
  reportado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resuelto_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resuelto_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trabajos_pedido_idx ON public.trabajos(pedido_id);
CREATE INDEX IF NOT EXISTS trabajos_responsable_idx ON public.trabajos(responsable_user_id);
CREATE INDEX IF NOT EXISTS incidencias_trabajo_idx ON public.incidencias_trabajo(trabajo_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trabajos TO authenticated;
GRANT ALL ON public.trabajos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trabajo_archivos TO authenticated;
GRANT ALL ON public.trabajo_archivos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidencias_trabajo TO authenticated;
GRANT ALL ON public.incidencias_trabajo TO service_role;

ALTER TABLE public.trabajos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trabajo_archivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidencias_trabajo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trabajos_select ON public.trabajos;
CREATE POLICY trabajos_select ON public.trabajos FOR SELECT TO authenticated
  USING (public.es_admin(auth.uid()) OR responsable_user_id = auth.uid());

DROP POLICY IF EXISTS trabajos_admin_write ON public.trabajos;
CREATE POLICY trabajos_admin_write ON public.trabajos FOR ALL TO authenticated
  USING (public.es_admin(auth.uid()))
  WITH CHECK (public.es_admin(auth.uid()));

DROP POLICY IF EXISTS trabajos_responsable_update ON public.trabajos;
CREATE POLICY trabajos_responsable_update ON public.trabajos FOR UPDATE TO authenticated
  USING (responsable_user_id = auth.uid())
  WITH CHECK (responsable_user_id = auth.uid());

DROP POLICY IF EXISTS trabajo_archivos_all ON public.trabajo_archivos;
CREATE POLICY trabajo_archivos_all ON public.trabajo_archivos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trabajos t WHERE t.id = trabajo_id AND (public.es_admin(auth.uid()) OR t.responsable_user_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trabajos t WHERE t.id = trabajo_id AND (public.es_admin(auth.uid()) OR t.responsable_user_id = auth.uid())));

DROP POLICY IF EXISTS incidencias_trabajo_all ON public.incidencias_trabajo;
CREATE POLICY incidencias_trabajo_all ON public.incidencias_trabajo FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trabajos t WHERE t.id = trabajo_id AND (public.es_admin(auth.uid()) OR t.responsable_user_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trabajos t WHERE t.id = trabajo_id AND (public.es_admin(auth.uid()) OR t.responsable_user_id = auth.uid())));

DROP TRIGGER IF EXISTS trabajos_set_updated_at ON public.trabajos;
CREATE TRIGGER trabajos_set_updated_at BEFORE UPDATE ON public.trabajos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.cambiar_estado_trabajo(_trabajo_id uuid, _nuevo_estado text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _resp uuid;
BEGIN
  IF _nuevo_estado NOT IN ('pendiente','en_proceso','bloqueado','completado','cancelado') THEN
    RAISE EXCEPTION 'Estado no válido: %', _nuevo_estado;
  END IF;

  SELECT responsable_user_id INTO _resp FROM public.trabajos WHERE id = _trabajo_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trabajo no encontrado';
  END IF;

  IF NOT (public.es_admin(auth.uid()) OR _resp = auth.uid()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.trabajos
  SET estado = _nuevo_estado,
      fecha_inicio = CASE WHEN _nuevo_estado = 'en_proceso' AND fecha_inicio IS NULL THEN now() ELSE fecha_inicio END,
      fecha_fin = CASE WHEN _nuevo_estado = 'completado' THEN now() ELSE fecha_fin END
  WHERE id = _trabajo_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cambiar_estado_trabajo(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cambiar_estado_trabajo(uuid, text) TO authenticated, service_role;