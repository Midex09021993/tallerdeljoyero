-- Tabla maestra del Conversor Profesional de Tallas de Anillo.
-- Equivalencias proporcionadas por el propietario del taller.

INSERT INTO public.config_sistema (clave, valor)
VALUES (
  'conversor_tallas_anillo',
  '{
    "tabla": [
      {"diametroMm":14.6,"europea":6,"americana":null},
      {"diametroMm":15.0,"europea":7,"americana":4},
      {"diametroMm":15.3,"europea":8,"americana":null},
      {"diametroMm":15.6,"europea":9,"americana":5},
      {"diametroMm":15.9,"europea":10,"americana":null},
      {"diametroMm":16.2,"europea":11,"americana":null},
      {"diametroMm":16.5,"europea":12,"americana":6},
      {"diametroMm":16.8,"europea":13,"americana":null},
      {"diametroMm":17.2,"europea":14,"americana":7},
      {"diametroMm":17.5,"europea":15,"americana":null},
      {"diametroMm":17.8,"europea":16,"americana":null},
      {"diametroMm":18.1,"europea":17,"americana":8},
      {"diametroMm":18.4,"europea":18,"americana":null},
      {"diametroMm":18.8,"europea":19,"americana":null},
      {"diametroMm":19.1,"europea":20,"americana":9},
      {"diametroMm":19.4,"europea":21,"americana":null},
      {"diametroMm":19.7,"europea":22,"americana":10},
      {"diametroMm":20.0,"europea":23,"americana":null},
      {"diametroMm":20.3,"europea":24,"americana":null},
      {"diametroMm":20.6,"europea":25,"americana":11},
      {"diametroMm":21.0,"europea":26,"americana":null},
      {"diametroMm":21.3,"europea":27,"americana":12},
      {"diametroMm":21.6,"europea":28,"americana":null},
      {"diametroMm":22.0,"europea":29,"americana":null},
      {"diametroMm":22.3,"europea":30,"americana":13},
      {"diametroMm":22.6,"europea":31,"americana":null},
      {"diametroMm":22.9,"europea":32,"americana":null},
      {"diametroMm":23.2,"europea":33,"americana":14},
      {"diametroMm":23.5,"europea":34,"americana":null},
      {"diametroMm":23.9,"europea":35,"americana":15}
    ]
  }'::jsonb
)
ON CONFLICT (clave) DO NOTHING;

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
