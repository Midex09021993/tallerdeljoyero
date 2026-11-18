ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS corte_texto text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS corte_tipografia text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS corte_ubicacion text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS corte_observaciones text NOT NULL DEFAULT '';