CREATE TABLE IF NOT EXISTS public.contrato_pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  contrato_numero text NOT NULL DEFAULT '',
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  concepto text NOT NULL DEFAULT 'Abono',
  monto numeric NOT NULL CHECK (monto > 0),
  usuario_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contrato_pagos_contrato_id_idx
  ON public.contrato_pagos (contrato_id);

CREATE INDEX IF NOT EXISTS contrato_pagos_contrato_numero_idx
  ON public.contrato_pagos (contrato_numero);

ALTER TABLE public.contrato_pagos ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_pagos TO authenticated;
GRANT ALL ON public.contrato_pagos TO service_role;

DROP POLICY IF EXISTS "pagos contrato por sede" ON public.contrato_pagos;
CREATE POLICY "pagos contrato por sede" ON public.contrato_pagos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.contratos c
      WHERE c.id = contrato_pagos.contrato_id
        AND public.ve_sede(auth.uid(), c.sede_id)
    )
  );

DROP POLICY IF EXISTS "pagos contrato crear admin" ON public.contrato_pagos;
CREATE POLICY "pagos contrato crear admin" ON public.contrato_pagos FOR INSERT TO authenticated
  WITH CHECK (
    public.es_admin(auth.uid())
    AND usuario_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.contratos c
      WHERE c.id = contrato_pagos.contrato_id
        AND public.ve_sede(auth.uid(), c.sede_id)
    )
  );

DROP POLICY IF EXISTS "pagos contrato editar admin" ON public.contrato_pagos;
CREATE POLICY "pagos contrato editar admin" ON public.contrato_pagos FOR UPDATE TO authenticated
  USING (
    public.es_admin(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.contratos c
      WHERE c.id = contrato_pagos.contrato_id
        AND public.ve_sede(auth.uid(), c.sede_id)
    )
  )
  WITH CHECK (
    public.es_admin(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.contratos c
      WHERE c.id = contrato_pagos.contrato_id
        AND public.ve_sede(auth.uid(), c.sede_id)
    )
  );

DROP POLICY IF EXISTS "pagos contrato borrar admin" ON public.contrato_pagos;
CREATE POLICY "pagos contrato borrar admin" ON public.contrato_pagos FOR DELETE TO authenticated
  USING (
    public.es_admin(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.contratos c
      WHERE c.id = contrato_pagos.contrato_id
        AND public.ve_sede(auth.uid(), c.sede_id)
    )
  );

CREATE OR REPLACE FUNCTION public.recalcular_abonado_contrato(_contrato_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.contratos c
  SET
    abonado = COALESCE((
      SELECT SUM(p.monto)
      FROM public.contrato_pagos p
      WHERE p.contrato_id = _contrato_id
    ), 0),
    updated_at = now()
  WHERE c.id = _contrato_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sincronizar_abonado_contrato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _contrato_id uuid;
BEGIN
  _contrato_id := COALESCE(NEW.contrato_id, OLD.contrato_id);
  PERFORM public.recalcular_abonado_contrato(_contrato_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS contrato_pagos_sync_abonado ON public.contrato_pagos;
CREATE TRIGGER contrato_pagos_sync_abonado
AFTER INSERT OR UPDATE OR DELETE ON public.contrato_pagos
FOR EACH ROW EXECUTE FUNCTION public.sincronizar_abonado_contrato();

INSERT INTO public.contrato_pagos (contrato_id, contrato_numero, fecha, concepto, monto, usuario_id)
SELECT c.id, c.numero, CURRENT_DATE, 'Abonado registrado', c.abonado, NULL
FROM public.contratos c
WHERE c.abonado > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.contrato_pagos p
    WHERE p.contrato_id = c.id
  );
