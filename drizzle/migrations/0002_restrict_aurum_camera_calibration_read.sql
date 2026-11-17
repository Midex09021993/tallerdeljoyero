DROP POLICY IF EXISTS "Authenticated users can read AURUM master camera calibration"
  ON public.aurum_camera_calibration_global;

CREATE POLICY "Workshop staff and active participants can read AURUM master camera calibration"
  ON public.aurum_camera_calibration_global
  FOR SELECT TO authenticated
  USING (
    public.es_interno(auth.uid())
    OR public.mi_participante(auth.uid()) IS NOT NULL
  );