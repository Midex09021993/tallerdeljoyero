-- Hardening: las eliminaciones comerciales son exclusivas del Dueño.
-- No debe existir una policy ALL para gerente que pueda ampliar DELETE.

drop policy if exists "clientes gestionar" on public.clientes;
drop policy if exists "cotizaciones gestionar" on public.cotizaciones;
drop policy if exists "pedido_comercial_delete" on public.pedido_comercial;
