DROP FUNCTION IF EXISTS public.seguimiento_pedido(text);

CREATE OR REPLACE FUNCTION public.seguimiento_pedido(_ref text)
 RETURNS TABLE(referencia text, trabajo text, cliente text, area_actual text, estado text, ventas_estado text, ruta text[], fecha_entrega date, fecha_envio date, fecha_entregado date, medio_envio text, guia_envio text, receptor_envio text, sede text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.referencia,
         COALESCE(NULLIF(p.trabajo, ''), p.pieza) AS trabajo,
         split_part(p.cliente, ' ', 1) AS cliente,
         p.area_actual,
         CASE
           WHEN p.estado IN ('Evaluación', 'Espera material') THEN 'Recibido'
           WHEN p.estado IN ('Área de Ventas', 'En Ventas', 'En packing', 'Recibido en ventas', 'Terminado') THEN 'Listo para Entrega'
           WHEN p.estado IN ('Enviado', 'Despachado') THEN 'En Camino'
           ELSE p.estado
         END AS estado,
         CASE
           WHEN p.ventas_estado IN ('Área de Ventas', 'En Ventas', 'En packing', 'Recibido en ventas') THEN 'Listo para Entrega'
           WHEN p.ventas_estado IN ('Enviado', 'Despachado') THEN 'En Camino'
           ELSE p.ventas_estado
         END AS ventas_estado,
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
$function$;