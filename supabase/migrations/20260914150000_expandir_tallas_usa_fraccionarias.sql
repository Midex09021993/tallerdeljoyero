-- Ampliación del Conversor Profesional de Tallas de Anillo.
-- Mantiene intactas las filas existentes del taller y agrega tallas USA fraccionarias.
-- Las fracciones se almacenan como texto para conservar el formato tradicional:
-- "6 1/4", "6 1/2", "6 3/4", etc.

UPDATE public.config_sistema AS c
SET valor = jsonb_set(
  COALESCE(c.valor, '{}'::jsonb),
  '{tabla}',
  COALESCE(c.valor->'tabla', '[]'::jsonb)
  ||
  COALESCE(
    (
      SELECT jsonb_agg(f)
      FROM jsonb_array_elements(
        '[
          {"diametroMm":15.04,"europea":7,"americana":"4 1/4"},
          {"diametroMm":15.27,"europea":8,"americana":"4 1/2"},
          {"diametroMm":15.53,"europea":9,"americana":"4 3/4"},
          {"diametroMm":15.90,"europea":10,"americana":"5 1/4"},
          {"diametroMm":16.10,"europea":11,"americana":"5 1/2"},
          {"diametroMm":16.30,"europea":11,"americana":"5 3/4"},
          {"diametroMm":16.71,"europea":13,"americana":"6 1/4"},
          {"diametroMm":16.92,"europea":13,"americana":"6 1/2"},
          {"diametroMm":17.13,"europea":14,"americana":"6 3/4"},
          {"diametroMm":17.45,"europea":15,"americana":"7 1/4"},
          {"diametroMm":17.75,"europea":16,"americana":"7 1/2"},
          {"diametroMm":17.97,"europea":17,"americana":"7 3/4"},
          {"diametroMm":18.35,"europea":18,"americana":"8 1/4"},
          {"diametroMm":18.53,"europea":18,"americana":"8 1/2"},
          {"diametroMm":18.69,"europea":19,"americana":"8 3/4"},
          {"diametroMm":19.22,"europea":20,"americana":"9 1/4"},
          {"diametroMm":19.41,"europea":21,"americana":"9 1/2"},
          {"diametroMm":19.62,"europea":22,"americana":"9 3/4"},
          {"diametroMm":20.02,"europea":23,"americana":"10 1/4"},
          {"diametroMm":20.20,"europea":24,"americana":"10 1/2"},
          {"diametroMm":20.44,"europea":24,"americana":"10 3/4"},
          {"diametroMm":20.85,"europea":26,"americana":"11 1/4"},
          {"diametroMm":21.08,"europea":26,"americana":"11 1/2"},
          {"diametroMm":21.24,"europea":27,"americana":"11 3/4"},
          {"diametroMm":21.69,"europea":28,"americana":"12 1/4"},
          {"diametroMm":21.89,"europea":29,"americana":"12 1/2"},
          {"diametroMm":22.10,"europea":29,"americana":"12 3/4"},
          {"diametroMm":22.40,"europea":30,"americana":"13 1/4"},
          {"diametroMm":22.60,"europea":31,"americana":"13 1/2"},
          {"diametroMm":22.80,"europea":32,"americana":"13 3/4"},
          {"diametroMm":23.20,"europea":33,"americana":"14 1/4"},
          {"diametroMm":23.40,"europea":34,"americana":"14 1/2"},
          {"diametroMm":23.60,"europea":34,"americana":"14 3/4"},
          {"diametroMm":24.00,"europea":35,"americana":"15 1/4"},
          {"diametroMm":24.20,"europea":35,"americana":"15 1/2"},
          {"diametroMm":24.40,"europea":35,"americana":"15 3/4"}
        ]'::jsonb
      ) AS f
      WHERE NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(c.valor->'tabla', '[]'::jsonb)) AS e
        WHERE e->>'americana' = f->>'americana'
      )
    ),
    '[]'::jsonb
  )
)
WHERE c.clave = 'conversor_tallas_anillo';
