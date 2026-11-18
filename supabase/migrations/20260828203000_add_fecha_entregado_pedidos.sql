ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS fecha_entregado date;
