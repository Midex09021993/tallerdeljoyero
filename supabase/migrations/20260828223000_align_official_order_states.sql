ALTER TABLE public.pedidos
  ALTER COLUMN estado SET DEFAULT 'Recibido';

UPDATE public.pedidos
SET
  area_actual = CASE
    WHEN area_actual IN ('Servicio láser', 'Corte láser', 'Corte Laser') THEN 'Corte Láser'
    WHEN area_actual = 'Taller / Engaste' THEN 'Taller'
    WHEN area_actual IN ('Ventas', 'Área de Ventas', 'En Ventas', 'Terminado', 'Entregado') THEN 'Área ventas'
    ELSE area_actual
  END,
  estado = CASE
    WHEN estado = 'Cancelado' THEN 'Cancelado'
    WHEN estado IN ('Entregado', 'Terminado') THEN 'Entregado'
    WHEN estado IN ('Enviado', 'Despachado') THEN 'Enviado'
    WHEN estado = 'Listo para Entrega' THEN 'Listo para Entrega'
    WHEN estado IN ('En Ventas', 'En packing', 'Recibido en ventas', 'Área ventas', 'Área de Ventas', 'Ventas')
      OR area_actual IN ('Área ventas', 'Área de Ventas', 'Ventas') THEN 'Área de Ventas'
    WHEN estado = 'Evaluación' THEN 'Evaluación'
    WHEN estado = 'Recibido' THEN 'Recibido'
    WHEN area_actual = 'Pedidos' THEN 'Recibido'
    ELSE 'En Producción'
  END,
  ruta = ARRAY(
    SELECT DISTINCT area_normalizada
    FROM (
      SELECT CASE
        WHEN area IN ('Servicio láser', 'Corte láser', 'Corte Laser') THEN 'Corte Láser'
        WHEN area = 'Taller / Engaste' THEN 'Taller'
        WHEN area IN ('Ventas', 'Área de Ventas', 'Área ventas', 'En Ventas', 'Terminado', 'Entregado', 'Pedidos') THEN NULL
        ELSE area
      END AS area_normalizada
      FROM unnest(ruta) AS area
    ) normalizadas
    WHERE area_normalizada IS NOT NULL
  );

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
