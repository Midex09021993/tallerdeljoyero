DROP POLICY IF EXISTS especialidades_lectura ON public.especialidades;
CREATE POLICY especialidades_lectura ON public.especialidades FOR SELECT TO authenticated USING (activa = true);