CREATE TABLE IF NOT EXISTS public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE,
  cliente text NOT NULL DEFAULT '',
  telefono text NOT NULL DEFAULT '',
  origen text NOT NULL DEFAULT '',
  total numeric NOT NULL DEFAULT 0,
  abonado numeric NOT NULL DEFAULT 0,
  sede_id uuid REFERENCES public.sedes(id) ON DELETE SET NULL,
  notas text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos TO authenticated;
GRANT ALL ON public.contratos TO service_role;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contratos_select" ON public.contratos FOR SELECT TO authenticated
  USING (public.ve_sede(auth.uid(), sede_id));
CREATE POLICY "contratos_insert" ON public.contratos FOR INSERT TO authenticated
  WITH CHECK (public.ve_sede(auth.uid(), sede_id));
CREATE POLICY "contratos_update" ON public.contratos FOR UPDATE TO authenticated
  USING (public.ve_sede(auth.uid(), sede_id));
CREATE POLICY "contratos_delete" ON public.contratos FOR DELETE TO authenticated
  USING (public.es_admin(auth.uid()));

CREATE TRIGGER contratos_updated_at BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.contrato_pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid REFERENCES public.contratos(id) ON DELETE CASCADE,
  contrato_numero text NOT NULL DEFAULT '',
  fecha date NOT NULL DEFAULT current_date,
  concepto text NOT NULL DEFAULT '',
  monto numeric NOT NULL DEFAULT 0,
  usuario_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contrato_pagos_contrato_id_idx ON public.contrato_pagos(contrato_id);
CREATE INDEX IF NOT EXISTS contrato_pagos_contrato_numero_idx ON public.contrato_pagos(contrato_numero);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_pagos TO authenticated;
GRANT ALL ON public.contrato_pagos TO service_role;
ALTER TABLE public.contrato_pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contrato_pagos_select" ON public.contrato_pagos FOR SELECT TO authenticated USING (true);
CREATE POLICY "contrato_pagos_insert" ON public.contrato_pagos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "contrato_pagos_update" ON public.contrato_pagos FOR UPDATE TO authenticated USING (public.es_admin(auth.uid()));
CREATE POLICY "contrato_pagos_delete" ON public.contrato_pagos FOR DELETE TO authenticated USING (public.es_admin(auth.uid()));