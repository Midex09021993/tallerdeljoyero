DROP FUNCTION IF EXISTS public.seguimiento_pedido(text);

CREATE FUNCTION public.seguimiento_pedido(_ref text)
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
         s.nombre AS sede
  FROM public.pedidos p
  LEFT JOIN public.sedes s ON s.id = p.sede_id
  WHERE lower(trim(p.referencia)) = lower(trim(_ref))
     OR lower(trim(COALESCE(p.contrato, ''))) = lower(trim(_ref))
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.seguimiento_pedido(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seguimiento_pedido(text) TO anon, authenticated;