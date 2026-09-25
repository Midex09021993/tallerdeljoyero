-- Modelo comercial y operativo del pedido
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS tipo_operacion text NOT NULL DEFAULT 'fabricacion',
  ADD COLUMN IF NOT EXISTS canal_captacion text;

ALTER TABLE public.pedidos
  DROP CONSTRAINT IF EXISTS pedidos_tipo_operacion_check;

ALTER TABLE public.pedidos
  ADD CONSTRAINT pedidos_tipo_operacion_check
  CHECK (tipo_operacion IN ('fabricacion','reparacion','venta_stock'));

COMMENT ON COLUMN public.pedidos.tipo_operacion IS
  'Tipo operativo del pedido: fabricacion, reparacion o venta_stock.';

COMMENT ON COLUMN public.pedidos.canal_captacion IS
  'Canal por el que ingreso el cliente/pedido: web, tienda, WhatsApp, Instagram, referido, etc.';
