ALTER TABLE public.pedidos
  ALTER COLUMN estado SET DEFAULT 'Pedidos',
  ALTER COLUMN area_actual SET DEFAULT 'Pedidos',
  ALTER COLUMN ruta SET DEFAULT ARRAY['Taller']::text[];

UPDATE public.pedidos
SET area_actual = CASE
  WHEN area_actual IN ('Servicio láser', 'Corte láser', 'Corte Laser') THEN 'Corte Láser'
  WHEN area_actual = 'Taller / Engaste' THEN 'Taller'
  ELSE area_actual
END,
estado = CASE
  WHEN estado IN ('Servicio láser', 'Corte láser', 'Corte Laser') THEN 'Corte Láser'
  WHEN estado = 'Taller / Engaste' THEN 'Taller'
  ELSE estado
END,
ruta = ARRAY(
  SELECT CASE
    WHEN area IN ('Servicio láser', 'Corte láser', 'Corte Laser') THEN 'Corte Láser'
    WHEN area = 'Taller / Engaste' THEN 'Taller'
    ELSE area
  END
  FROM unnest(ruta) AS area
);

DELETE FROM public.user_areas ua
WHERE ua.area IN ('Servicio láser', 'Corte láser', 'Corte Laser', 'Taller / Engaste')
  AND EXISTS (
    SELECT 1
    FROM public.user_areas existente
    WHERE existente.user_id = ua.user_id
      AND existente.area = CASE
        WHEN ua.area IN ('Servicio láser', 'Corte láser', 'Corte Laser') THEN 'Corte Láser'
        WHEN ua.area = 'Taller / Engaste' THEN 'Taller'
        ELSE ua.area
      END
  );

UPDATE public.user_areas
SET area = CASE
  WHEN area IN ('Servicio láser', 'Corte láser', 'Corte Laser') THEN 'Corte Láser'
  WHEN area = 'Taller / Engaste' THEN 'Taller'
  ELSE area
END;

DELETE FROM public.material_areas ma
WHERE ma.area IN ('Servicio láser', 'Corte láser', 'Corte Laser', 'Taller / Engaste')
  AND EXISTS (
    SELECT 1
    FROM public.material_areas existente
    WHERE existente.material_id = ma.material_id
      AND existente.area = CASE
        WHEN ma.area IN ('Servicio láser', 'Corte láser', 'Corte Laser') THEN 'Corte Láser'
        WHEN ma.area = 'Taller / Engaste' THEN 'Taller'
        ELSE ma.area
      END
  );

UPDATE public.material_areas
SET area = CASE
  WHEN area IN ('Servicio láser', 'Corte láser', 'Corte Laser') THEN 'Corte Láser'
  WHEN area = 'Taller / Engaste' THEN 'Taller'
  ELSE area
END;
