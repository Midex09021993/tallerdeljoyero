ALTER TABLE public.aurum_community_stats
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

UPDATE public.aurum_community_stats SET is_public = true WHERE metric_key LIKE 'verified\_%';

GRANT ALL ON public.aurum_community_stats TO service_role;

DROP POLICY IF EXISTS "Public can read community stats" ON public.aurum_community_stats;
DROP POLICY IF EXISTS "Public can read published community stats" ON public.aurum_community_stats;
CREATE POLICY "Public can read published community stats"
  ON public.aurum_community_stats
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);