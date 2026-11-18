ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS ventas_estado text NOT NULL DEFAULT 'Recibido en ventas',
  ADD COLUMN IF NOT EXISTS packing_estado text NOT NULL DEFAULT 'Pendiente',
  ADD COLUMN IF NOT EXISTS medio_envio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS guia_envio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_envio date,
  ADD COLUMN IF NOT EXISTS receptor_envio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS notas_ventas text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_entregado date;

CREATE TABLE IF NOT EXISTS public.config_sistema (
  clave text PRIMARY KEY,
  valor jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_sistema TO authenticated;
GRANT ALL ON public.config_sistema TO service_role;

ALTER TABLE public.config_sistema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "config sistema ver" ON public.config_sistema;
CREATE POLICY "config sistema ver" ON public.config_sistema
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "config sistema dueno" ON public.config_sistema;
CREATE POLICY "config sistema dueno" ON public.config_sistema
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'dueno'))
WITH CHECK (public.has_role(auth.uid(), 'dueno'));

INSERT INTO public.config_sistema (clave, valor)
VALUES ('calculadora_yeso', '{"tolerancias":{"liso":-5,"perforado":20}}'::jsonb)
ON CONFLICT (clave) DO NOTHING;