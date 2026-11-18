-- Mi Nube se puede habilitar o deshabilitar por taller desde Capacidades del taller.
-- No se activa automáticamente en ninguna sede existente.
insert into public.especialidades (nombre, categoria, activa)
values ('Mi nube', 'Herramientas', true)
on conflict (nombre) do update
set categoria = 'Herramientas',
    activa = true;
