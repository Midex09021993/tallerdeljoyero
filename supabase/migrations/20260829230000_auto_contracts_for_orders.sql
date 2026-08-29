WITH contratos_faltantes AS (
  INSERT INTO public.contratos (numero, cliente, telefono, origen, total, abonado, sede_id, notas)
  SELECT
    trim(p.contrato) AS numero,
    max(p.cliente) AS cliente,
    max(p.telefono) AS telefono,
    max(p.origen) AS origen,
    COALESCE(sum(p.importe), 0) AS total,
    0 AS abonado,
    max(p.sede_id) AS sede_id,
    'Documento comercial creado automáticamente desde pedidos existentes.' AS notas
  FROM public.pedidos p
  WHERE p.contrato_id IS NULL
    AND trim(COALESCE(p.contrato, '')) <> ''
  GROUP BY trim(p.contrato)
  ON CONFLICT (numero) DO UPDATE SET
    cliente = COALESCE(NULLIF(public.contratos.cliente, ''), EXCLUDED.cliente),
    telefono = COALESCE(NULLIF(public.contratos.telefono, ''), EXCLUDED.telefono),
    origen = COALESCE(NULLIF(public.contratos.origen, ''), EXCLUDED.origen),
    total = GREATEST(public.contratos.total, EXCLUDED.total),
    sede_id = COALESCE(public.contratos.sede_id, EXCLUDED.sede_id)
  RETURNING id, numero
)
UPDATE public.pedidos p
SET contrato_id = c.id
FROM public.contratos c
WHERE p.contrato_id IS NULL
  AND trim(COALESCE(p.contrato, '')) <> ''
  AND c.numero = trim(p.contrato);

-- Importante:
-- Los pedidos históricos sin N° Contrato se conservan sin contrato automático.
-- La generación CTR-YYYY-0001 solo ocurre para pedidos nuevos desde la aplicación.
