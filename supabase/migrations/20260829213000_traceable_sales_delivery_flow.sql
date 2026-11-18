ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS fecha_listo_entrega date,
  ADD COLUMN IF NOT EXISTS listo_entrega_observaciones text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS notas_envio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS notas_entrega text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS usuario_listo_entrega uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS usuario_envio uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS usuario_entrega uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ventas_actualizado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ventas_actualizado_en timestamptz,
  ADD COLUMN IF NOT EXISTS enviado_at timestamptz,
  ADD COLUMN IF NOT EXISTS entregado_at timestamptz;

UPDATE public.pedidos
SET
  notas_envio = COALESCE(NULLIF(notas_envio, ''), notas_ventas, ''),
  notas_entrega = COALESCE(NULLIF(notas_entrega, ''), notas_ventas, '')
WHERE area_actual IN ('Área ventas', 'Área de Ventas', 'Ventas')
  AND (notas_ventas IS NOT NULL AND notas_ventas <> '');

CREATE OR REPLACE FUNCTION public.seguimiento_pedido(_ref text)
RETURNS TABLE (
  referencia text,
  trabajo text,
  cliente text,
  area_actual text,
  estado text,
  ventas_estado text,
  ruta text[],
  fecha_entrega date,
  fecha_envio date,
  fecha_entregado date,
  medio_envio text,
  guia_envio text,
  receptor_envio text,
  sede text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.referencia,
         COALESCE(NULLIF(p.trabajo, ''), p.pieza) AS trabajo,
         split_part(p.cliente, ' ', 1) AS cliente,
         CASE
           WHEN p.area_actual IN ('Ventas', 'Área de Ventas', 'En Ventas') THEN 'Área ventas'
           ELSE p.area_actual
         END AS area_actual,
         CASE
           WHEN p.estado = 'En Ventas' THEN 'Área de Ventas'
           WHEN p.estado IN ('Área ventas', 'Ventas') THEN 'Área de Ventas'
           ELSE p.estado
         END AS estado,
         p.ventas_estado,
         p.ruta,
         p.fecha_entrega,
         p.fecha_envio,
         p.fecha_entregado,
         p.medio_envio,
         p.guia_envio,
         p.receptor_envio,
         s.nombre AS sede
  FROM public.pedidos p
  LEFT JOIN public.sedes s ON s.id = p.sede_id
  WHERE lower(trim(p.referencia)) = lower(trim(_ref))
     OR lower(trim(COALESCE(p.contrato, ''))) = lower(trim(_ref))
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.seguimiento_pedido(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seguimiento_pedido(text) TO anon, authenticated;
