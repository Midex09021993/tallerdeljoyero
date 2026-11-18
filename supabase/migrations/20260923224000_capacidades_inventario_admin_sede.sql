-- Capacidades de inventario, herramientas y administración por sede.
-- Idempotente: solo crea capacidades que todavía no existen.

insert into public.especialidades (nombre, categoria, activa)
select x.nombre, x.categoria, true
from (
  values
    ('Inventario', 'Inventario'),
    ('Compras', 'Inventario'),
    ('Herramientas', 'Herramientas'),
    ('Migración', 'Administración')
) as x(nombre, categoria)
where not exists (
  select 1
  from public.especialidades e
  where lower(trim(e.nombre)) = lower(trim(x.nombre))
);
