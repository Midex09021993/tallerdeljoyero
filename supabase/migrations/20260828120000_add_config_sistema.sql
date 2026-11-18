CREATE TABLE IF NOT EXISTS public.config_sistema (
  clave text PRIMARY KEY,
  valor jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.config_sistema TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.config_sistema TO authenticated;
GRANT ALL ON public.config_sistema TO service_role;

ALTER TABLE public.config_sistema ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config sistema ver" ON public.config_sistema
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "config sistema dueno" ON public.config_sistema
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'dueno'))
WITH CHECK (public.has_role(auth.uid(), 'dueno'));

CREATE TRIGGER config_sistema_updated_at BEFORE UPDATE ON public.config_sistema
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.config_sistema (clave, valor)
VALUES ('calculadora_yeso', '{"tolerancias":{"liso":-5,"perforado":20}}'::jsonb)
ON CONFLICT (clave) DO NOTHING;
