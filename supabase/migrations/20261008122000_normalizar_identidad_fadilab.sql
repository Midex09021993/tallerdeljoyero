-- Normaliza una identidad comercial heredada que fue creada con el nombre de un área
-- en lugar del nombre comercial real de la empresa.
-- Condición deliberadamente específica para no alterar otras identidades.

UPDATE public.identidades_comerciales
SET nombre_comercial = 'FADILAB'
WHERE nombre_comercial = 'Gerencia general'
  AND razon_social = 'FADILAB E.I.R.L.'
  AND ruc = '20612717789';
