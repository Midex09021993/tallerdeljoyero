-- Catálogo es una capacidad comercial configurable por sede.
-- 1) Garantiza que exista en el catálogo global de especialidades.
insert into public.especialidades (nombre, categoria, activa)
select 'Catálogo', 'Comercial', true
where not exists (
  select 1
  from public.especialidades
  where lower(trim(nombre)) = 'catálogo'
);

-- 2) Normaliza una eventual fila creada anteriormente con otra categoría.
update public.especialidades
set categoria = 'Comercial',
    activa = true
where lower(trim(nombre)) = 'catálogo';

-- 3) Durante la fase de prueba habilitamos Catálogo en las sedes activas existentes.
--    Desde Gestión puede desactivarse individualmente por sede.
insert into public.sede_especialidades (sede_id, especialidad_id)
select s.id, e.id
from public.sedes s
cross join public.especialidades e
where s.activa = true
  and lower(trim(e.nombre)) = 'catálogo'
  and e.activa = true
on conflict (sede_id, especialidad_id) do nothing;
