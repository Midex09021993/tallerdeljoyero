-- Seed inicial del catálogo de especialidades del ecosistema.
-- Las filas existentes no se duplican gracias a UNIQUE(nombre).
insert into public.especialidades (nombre, categoria, activa)
values
('Diseño de joyería','Diseño',true),
('Diseño 3D','Diseño',true),
('Modelado 3D','Diseño',true),
('Render de joyería','Diseño',true),
('Impresión 3D','Prototipado',true),
('Fundición','Producción',true),
('Microfusión','Producción',true),
('Engaste','Piedras',true),
('Engaste de alta joyería','Piedras',true),
('Selección de piedras','Piedras',true),
('Pulido','Acabados',true),
('Acabado de joyería','Acabados',true),
('Grabado','Acabados',true),
('Corte láser','Fabricación',true),
('Soldadura','Fabricación',true),
('Fabricación de joyería','Fabricación',true),
('Restauración de joyería','Especializado',true),
('Peritaje / Gemología','Especializado',true),
('Fotografía de joyería','Contenido',true),
('Prácticas de joyería','Talento',true)
on conflict (nombre) do nothing;