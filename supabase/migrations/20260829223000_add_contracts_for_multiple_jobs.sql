CREATE TABLE IF NOT EXISTS public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  cliente text NOT NULL DEFAULT '',
  telefono text NOT NULL DEFAULT '',
  origen text NOT NULL DEFAULT '',
  total numeric NOT NULL DEFAULT 0,
  abonado numeric NOT NULL DEFAULT 0,
  sede_id uuid REFERENCES public.sedes(id) ON DELETE SET NULL,
  notas text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contratos_numero_unique UNIQUE (numero)
);

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos TO authenticated;
GRANT ALL ON public.contratos TO service_role;

DROP POLICY IF EXISTS "contratos por sede" ON public.contratos;
CREATE POLICY "contratos por sede" ON public.contratos FOR SELECT TO authenticated
  USING (public.ve_sede(auth.uid(), sede_id));

DROP POLICY IF EXISTS "contratos crear admin" ON public.contratos;
CREATE POLICY "contratos crear admin" ON public.contratos FOR INSERT TO authenticated
  WITH CHECK (public.es_admin(auth.uid()) AND public.ve_sede(auth.uid(), sede_id));

DROP POLICY IF EXISTS "contratos editar admin" ON public.contratos;
CREATE POLICY "contratos editar admin" ON public.contratos FOR UPDATE TO authenticated
  USING (public.es_admin(auth.uid()) AND public.ve_sede(auth.uid(), sede_id))
  WITH CHECK (public.es_admin(auth.uid()) AND public.ve_sede(auth.uid(), sede_id));

DROP POLICY IF EXISTS "contratos borrar admin" ON public.contratos;
CREATE POLICY "contratos borrar admin" ON public.contratos FOR DELETE TO authenticated
  USING (public.es_admin(auth.uid()) AND public.ve_sede(auth.uid(), sede_id));

DROP TRIGGER IF EXISTS contratos_updated_at ON public.contratos;
CREATE TRIGGER contratos_updated_at BEFORE UPDATE ON public.contratos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS contrato_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL;

INSERT INTO public.contratos (numero, cliente, telefono, origen, total, abonado, sede_id, notas)
SELECT
  trim(p.contrato) AS numero,
  max(p.cliente) AS cliente,
  max(p.telefono) AS telefono,
  max(p.origen) AS origen,
  COALESCE(sum(p.importe), 0) AS total,
  0 AS abonado,
  max(p.sede_id) AS sede_id,
  'Contrato creado automáticamente desde pedidos existentes.' AS notas
FROM public.pedidos p
WHERE trim(COALESCE(p.contrato, '')) <> ''
GROUP BY trim(p.contrato)
ON CONFLICT (numero) DO UPDATE SET
  cliente = COALESCE(NULLIF(public.contratos.cliente, ''), EXCLUDED.cliente),
  telefono = COALESCE(NULLIF(public.contratos.telefono, ''), EXCLUDED.telefono),
  origen = COALESCE(NULLIF(public.contratos.origen, ''), EXCLUDED.origen),
  total = GREATEST(public.contratos.total, EXCLUDED.total),
  sede_id = COALESCE(public.contratos.sede_id, EXCLUDED.sede_id);

UPDATE public.pedidos p
SET contrato_id = c.id
FROM public.contratos c
WHERE p.contrato_id IS NULL
  AND trim(COALESCE(p.contrato, '')) <> ''
  AND c.numero = trim(p.contrato);
