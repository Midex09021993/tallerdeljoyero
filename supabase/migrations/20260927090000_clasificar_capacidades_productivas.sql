-- Clasificación productiva: las sedes solo activan cinco capacidades principales.
-- Las demás especialidades siguen existiendo en el catálogo global para servicios externos.
update public.especialidades
set categoria = 'Subcapacidad Taller'
where lower(trim(nombre)) in ('engaste','pulido','grabado');

update public.especialidades
set categoria = 'Especialización'
where lower(trim(nombre)) in ('fotografía','gemología');

update public.especialidades
set categoria = 'Producción'
where lower(trim(nombre)) in ('diseño 3d','impresión 3d','casting','corte láser','taller');

comment on table public.sede_especialidades is
  'Capacidades productivas principales habilitadas por sede. Solo Diseño 3D, Impresión 3D, Casting, Corte Láser y Taller se gestionan aquí como capacidades principales.';
