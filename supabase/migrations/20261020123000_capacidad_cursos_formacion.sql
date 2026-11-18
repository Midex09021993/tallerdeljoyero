-- Cursos y formación es una capacidad comercial opcional por sede.
-- No se habilita automáticamente: cada taller la activa desde Gestión > Capacidades.
insert into public.especialidades (nombre, categoria, activa)
select 'Cursos y formación', 'Comercial', true
where not exists (
  select 1
  from public.especialidades
  where lower(trim(nombre)) = lower(trim('Cursos y formación'))
);

update public.especialidades
set categoria = 'Comercial',
    activa = true
where lower(trim(nombre)) = lower(trim('Cursos y formación'));

notify pgrst, 'reload schema';
