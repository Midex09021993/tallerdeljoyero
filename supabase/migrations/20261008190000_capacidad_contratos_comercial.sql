-- Contratos es una capacidad comercial configurable por sede.
-- Idempotente: no duplica la especialidad si ya existe.
insert into public.especialidades (nombre, categoria, activa)
select 'Contratos', 'Comercial', true
where not exists (
  select 1
  from public.especialidades e
  where lower(trim(e.nombre)) = lower(trim('Contratos'))
);
