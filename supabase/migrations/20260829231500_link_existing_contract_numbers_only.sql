-- Vincula pedidos históricos a documentos comerciales usando únicamente el
-- N° Contrato ya registrado por el usuario. No genera, reemplaza ni renumera
-- contratos para pedidos históricos sin número.

INSERT INTO public.contratos (numero, cliente, telefono, origen, total, abonado, sede_id, notas)
SELECT
  trim(p.contrato) AS numero,
  max(p.cliente) AS cliente,
  max(p.telefono) AS telefono,
  max(p.origen) AS origen,
  COALESCE(sum(p.importe), 0) AS total,
  0 AS abonado,
  max(p.sede_id) AS sede_id,
  'Documento comercial creado automáticamente desde N° Contrato existente.' AS notas
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
