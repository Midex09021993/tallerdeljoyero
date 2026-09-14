-- Configuración centralizada de calculadoras.
-- Los valores se pueden consultar para ejecutar los cálculos,
-- pero las políticas RLS existentes permiten INSERT/UPDATE/DELETE únicamente al rol dueno.

INSERT INTO public.config_sistema (clave, valor)
VALUES
  (
    'calculadora_visualizador_3d',
    '{
      "densidades": {
        "oro18a": 15.5,
        "oro18b": 15.8,
        "oro18r": 15.3,
        "oro14": 13.1,
        "plata950": 10.4,
        "platino": 21.4
      },
      "factorEmpuje": 10,
      "factorSeguridad": 1
    }'::jsonb
  ),
  (
    'calculadora_aleacion_oro',
    '{
      "recetas": {
        "amarillo": {
          "metales": [
            {"nombre": "Plata", "porcentaje": 0.5},
            {"nombre": "Cobre", "porcentaje": 0.5}
          ]
        },
        "blanco": {
          "metales": [
            {"nombre": "Cobre", "porcentaje": 0.4},
            {"nombre": "Níquel", "porcentaje": 0.4},
            {"nombre": "Zinc", "porcentaje": 0.2}
          ]
        },
        "rosa": {
          "metales": [
            {"nombre": "Cobre", "porcentaje": 0.89},
            {"nombre": "Plata", "porcentaje": 0.11}
          ]
        }
      },
      "factorCalculo": 1
    }'::jsonb
  ),
  (
    'calculadora_yeso',
    '{
      "proporciones": [
        {"agua": 38, "yeso": 62, "recomendada": false},
        {"agua": 40, "yeso": 60, "recomendada": true},
        {"agua": 42, "yeso": 58, "recomendada": false}
      ],
      "volumenPorGramo": 0.4238,
      "factorCorreccion": 1,
      "tolerancias": {
        "liso": -5,
        "perforado": 20
      }
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
