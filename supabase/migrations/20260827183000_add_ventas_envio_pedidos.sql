ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS ventas_estado text NOT NULL DEFAULT 'Recibido en ventas',
  ADD COLUMN IF NOT EXISTS packing_estado text NOT NULL DEFAULT 'Pendiente',
  ADD COLUMN IF NOT EXISTS medio_envio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS guia_envio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_envio date,
  ADD COLUMN IF NOT EXISTS receptor_envio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS notas_ventas text NOT NULL DEFAULT '';
