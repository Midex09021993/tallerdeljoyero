ALTER TABLE public.pedido_archivos
  ADD COLUMN IF NOT EXISTS poster text NOT NULL DEFAULT '';