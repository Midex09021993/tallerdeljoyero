CREATE TABLE public.gastos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id uuid REFERENCES public.sedes(id) ON DELETE SET NULL,
  concepto text NOT NULL DEFAULT '',
  categoria text NOT NULL DEFAULT 'General',
  importe numeric NOT NULL DEFAULT 0,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gastos TO authenticated;
GRANT ALL ON public.gastos TO service_role;

ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gastos por sede" ON public.gastos
FOR ALL TO authenticated
USING (public.ve_sede(auth.uid(), sede_id))
WITH CHECK (public.ve_sede(auth.uid(), sede_id));

CREATE TRIGGER gastos_updated_at BEFORE UPDATE ON public.gastos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.config_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id uuid REFERENCES public.sedes(id) ON DELETE CASCADE,
  area text NOT NULL,
  horas_objetivo integer NOT NULL DEFAULT 48,
  alerta_activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sede_id, area)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_areas TO authenticated;
GRANT ALL ON public.config_areas TO service_role;

ALTER TABLE public.config_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config areas ver" ON public.config_areas
FOR SELECT TO authenticated
USING (public.ve_sede(auth.uid(), sede_id));

CREATE POLICY "config areas admin" ON public.config_areas
FOR ALL TO authenticated
USING (public.es_admin(auth.uid()) AND public.ve_sede(auth.uid(), sede_id))
WITH CHECK (public.es_admin(auth.uid()) AND public.ve_sede(auth.uid(), sede_id));

CREATE TRIGGER config_areas_updated_at BEFORE UPDATE ON public.config_areas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();