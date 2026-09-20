ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS documento text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS ciudad text,
  ADD COLUMN IF NOT EXISTS direccion text,
  ADD COLUMN IF NOT EXISTS notas text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'persona',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;