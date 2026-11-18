ALTER TABLE public.pedidos
  ALTER COLUMN estado SET DEFAULT 'Recibido',
  ALTER COLUMN area_actual SET DEFAULT 'Pedidos';

UPDATE public.pedidos
SET
  area_actual = CASE
    WHEN area_actual IN ('Servicio láser', 'Corte láser', 'Corte Laser') THEN 'Corte Láser'
    WHEN area_actual = 'Taller / Engaste' THEN 'Taller'
    WHEN area_actual IN ('Terminado', 'Entregado') THEN 'Área ventas'
    WHEN area_actual IN ('Ventas', 'Área de Ventas') THEN 'Área ventas'
    ELSE area_actual
  END,
  estado = CASE
    WHEN estado IN ('Entregado', 'Terminado') OR area_actual IN ('Entregado', 'Terminado') THEN 'Entregado'
    WHEN estado = 'Cancelado' THEN 'Cancelado'
    WHEN estado IN ('Enviado', 'Despachado') THEN 'Enviado'
    WHEN estado = 'Listo para Entrega' THEN 'Listo para Entrega'
    WHEN estado IN ('En Ventas', 'Recibido en ventas', 'En packing') OR area_actual IN ('Área ventas', 'Ventas', 'Área de Ventas') THEN 'En Ventas'
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
        WHEN area IN ('Ventas', 'Área de Ventas', 'Área ventas', 'Terminado', 'Entregado', 'Pedidos') THEN NULL
        ELSE area
      END AS area_normalizada
      FROM unnest(ruta) AS area
    ) normalizadas
    WHERE area_normalizada IS NOT NULL
  );
