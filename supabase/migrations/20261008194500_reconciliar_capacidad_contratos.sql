-- Reconciliación de la capacidad comercial Contratos.
-- Garantiza que exista, esté activa y pertenezca a Comercial.
-- No activa Contratos automáticamente en ninguna sede.

insert into public.especialidades (nombre, categoria, activa)
values ('Contratos', 'Comercial', true)
on conflict (nombre) do update
set categoria = 'Comercial',
    activa = true;
