CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push propias leer" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push dueno crear" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push propias actualizar" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push propias borrar" ON public.push_subscriptions;

CREATE POLICY "push propias leer" ON public.push_subscriptions
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "push dueno crear" ON public.push_subscriptions
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'dueno'));

CREATE POLICY "push propias actualizar" ON public.push_subscriptions
FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'dueno'))
WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'dueno'));

CREATE POLICY "push propias borrar" ON public.push_subscriptions
FOR DELETE TO authenticated
USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
