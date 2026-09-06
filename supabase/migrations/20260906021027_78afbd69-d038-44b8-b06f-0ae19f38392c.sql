CREATE OR REPLACE FUNCTION public.normaliza_area(_area text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _area
    WHEN 'Servicio láser' THEN 'Corte Láser'
    WHEN 'Corte láser' THEN 'Corte Láser'
    WHEN 'Corte Laser' THEN 'Corte Láser'
    WHEN 'Taller / Engaste' THEN 'Taller'
    WHEN 'Ventas' THEN 'Área ventas'
    WHEN 'Área de Ventas' THEN 'Área ventas'
    WHEN 'Terminado' THEN 'Área ventas'
    WHEN 'Entregado' THEN 'Área ventas'
    ELSE _area
  END
$$;

-- Quita duplicados que aparecerían tras normalizar
DELETE FROM public.user_areas a
  USING public.user_areas b
  WHERE a.user_id = b.user_id
    AND public.normaliza_area(a.area) = public.normaliza_area(b.area)
    AND a.ctid > b.ctid;

UPDATE public.user_areas SET area = public.normaliza_area(area)
  WHERE area <> public.normaliza_area(area);

DELETE FROM public.user_areas
  WHERE area NOT IN ('Pedidos','Diseño 3D','Impresión 3D','Casting','Corte Láser','Taller','Área ventas');