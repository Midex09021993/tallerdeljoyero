ALTER TABLE public.pedido_archivos
  ADD COLUMN IF NOT EXISTS grupo text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

UPDATE public.pedido_archivos SET grupo = lower(nombre) WHERE grupo = '';

CREATE INDEX IF NOT EXISTS pedido_archivos_grupo_idx ON public.pedido_archivos (pedido_id, grupo, version DESC);