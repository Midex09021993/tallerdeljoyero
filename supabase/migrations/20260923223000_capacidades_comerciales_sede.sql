-- Catálogo comercial para capacidades por sede.
-- Idempotente: solo crea capacidades que todavía no existen.

insert into public.especialidades (nombre, categoria, activa)
select x.nombre, 'Comercial', true
from (
  values
    ('Pedidos'),
    ('Cotizaciones'),
    ('Clientes'),
    ('Ventas')
) as x(nombre)
where not exists (
  select 1
  from public.especialidades e
  where lower(trim(e.nombre)) = lower(trim(x.nombre))
);
