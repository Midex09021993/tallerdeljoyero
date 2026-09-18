-- Actualiza el Conversor Profesional de Tallas de Anillo.
-- La escala 8–33 corresponde al tallaje España reproducido por guías de joyería españolas.
-- Europa se expresa como talla ISO (circunferencia interior en mm).
-- USA se referencia con la tabla internacional de GIA 4Cs.
-- Referencias visibles en la interfaz: JOSE LUIS Joyerías / guías de tallaje España,
-- ISO 8653:2016 y GIA 4Cs.

UPDATE public.config_sistema
SET valor = '{
  "tabla": [
    {"diametroMm":15.2,"espanola":8,"europeaIso":48,"americana":"4 1/2"},
    {"diametroMm":15.5,"espanola":9,"europeaIso":49,"americana":"4 3/4"},
    {"diametroMm":15.9,"espanola":10,"europeaIso":50,"americana":"5 1/4"},
    {"diametroMm":16.2,"espanola":11,"europeaIso":51,"americana":"5 3/4"},
    {"diametroMm":16.5,"espanola":12,"europeaIso":52,"americana":"6"},
    {"diametroMm":16.8,"espanola":13,"europeaIso":53,"americana":"6 1/4"},
    {"diametroMm":17.1,"espanola":14,"europeaIso":54,"americana":"6 3/4"},
    {"diametroMm":17.4,"espanola":15,"europeaIso":55,"americana":"7 1/4"},
    {"diametroMm":17.8,"espanola":16,"europeaIso":56,"americana":"7 1/2"},
    {"diametroMm":18.0,"espanola":17,"europeaIso":57,"americana":"8"},
    {"diametroMm":18.4,"espanola":18,"europeaIso":58,"americana":"8 1/4"},
    {"diametroMm":18.7,"espanola":19,"europeaIso":59,"americana":"8 3/4"},
    {"diametroMm":19.0,"espanola":20,"europeaIso":60,"americana":"9"},
    {"diametroMm":19.3,"espanola":21,"europeaIso":61,"americana":"9 1/2"},
    {"diametroMm":19.6,"espanola":22,"europeaIso":62,"americana":"9 3/4"},
    {"diametroMm":20.0,"espanola":23,"europeaIso":63,"americana":"10 1/4"},
    {"diametroMm":20.3,"espanola":24,"europeaIso":64,"americana":"10 1/2"},
    {"diametroMm":20.6,"espanola":25,"europeaIso":65,"americana":"11"},
    {"diametroMm":21.0,"espanola":26,"europeaIso":66,"americana":"11 1/2"},
    {"diametroMm":21.3,"espanola":27,"europeaIso":67,"americana":"12"},
    {"diametroMm":21.6,"espanola":28,"europeaIso":68,"americana":"12 1/4"},
    {"diametroMm":22.0,"espanola":29,"europeaIso":69,"americana":"12 3/4"},
    {"diametroMm":22.3,"espanola":30,"europeaIso":70,"americana":"13"},
    {"diametroMm":22.6,"espanola":31,"europeaIso":71,"americana":"13 1/2"},
    {"diametroMm":23.0,"espanola":32,"europeaIso":72,"americana":"14"},
    {"diametroMm":23.3,"espanola":33,"europeaIso":73,"americana":"14 1/2"}
  ]
}'::jsonb
WHERE clave = 'conversor_tallas_anillo';

INSERT INTO public.config_sistema (clave, valor)
SELECT 'conversor_tallas_anillo', '{
  "tabla": [
    {"diametroMm":15.2,"espanola":8,"europeaIso":48,"americana":"4 1/2"},
    {"diametroMm":15.5,"espanola":9,"europeaIso":49,"americana":"4 3/4"},
    {"diametroMm":15.9,"espanola":10,"europeaIso":50,"americana":"5 1/4"}
  ]
}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.config_sistema WHERE clave = 'conversor_tallas_anillo');
