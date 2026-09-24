-- Habilita el módulo Catálogo como capacidad comercial de sede.
insert into public.especialidades (nombre, categoria, activa)
select 'Catálogo', 'Comercial', true
where not exists (
  select 1 from public.especialidades
  where lower(trim(nombre)) = 'catálogo'
);

update public.especialidades
set categoria = 'Comercial', activa = true
where lower(trim(nombre)) = 'catálogo';
