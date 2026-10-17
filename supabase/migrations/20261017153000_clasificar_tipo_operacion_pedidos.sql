-- Clasificación explícita del flujo de entrada de pedidos.
-- Los pedidos históricos se conservan como fabricación para mantener el comportamiento previo.
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS tipo_operacion text NOT NULL DEFAULT 'fabricacion';

UPDATE public.pedidos
SET tipo_operacion = 'fabricacion'
WHERE tipo_operacion IS NULL OR btrim(tipo_operacion) = '';

ALTER TABLE public.pedidos
  DROP CONSTRAINT IF EXISTS pedidos_tipo_operacion_check;

ALTER TABLE public.pedidos
  ADD CONSTRAINT pedidos_tipo_operacion_check
  CHECK (tipo_operacion IN ('fabricacion', 'reparacion', 'venta_stock'));

COMMENT ON COLUMN public.pedidos.tipo_operacion IS
  'Clasificación del pedido al registrarlo: fabricación, reparación o venta de stock.';
