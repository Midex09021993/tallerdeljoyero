-- La referencia de un pedido debe ser única dentro de su taller.
-- Esto protege contra colisiones de numeración concurrentes en la interfaz.
create unique index if not exists pedidos_sede_referencia_key
on public.pedidos (sede_id, referencia);
