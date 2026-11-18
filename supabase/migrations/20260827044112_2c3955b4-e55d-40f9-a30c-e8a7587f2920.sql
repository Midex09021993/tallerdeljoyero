ALTER TABLE public.pedidos ALTER COLUMN ruta SET DEFAULT ARRAY['Diseño 3D','Impresión 3D','Casting','Taller','Terminado']::text[];

UPDATE public.pedidos
SET ruta = array_replace(ruta, 'Área ventas', 'Terminado')
WHERE 'Área ventas' = ANY(ruta);

UPDATE public.pedidos
SET area_actual = 'Terminado'
WHERE area_actual = 'Área ventas';