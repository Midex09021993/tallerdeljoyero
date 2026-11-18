ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS contrato_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fecha_listo_entrega timestamptz,
  ADD COLUMN IF NOT EXISTS listo_entrega_observaciones text,
  ADD COLUMN IF NOT EXISTS notas_envio text,
  ADD COLUMN IF NOT EXISTS notas_entrega text,
  ADD COLUMN IF NOT EXISTS usuario_listo_entrega text,
  ADD COLUMN IF NOT EXISTS usuario_envio text,
  ADD COLUMN IF NOT EXISTS usuario_entrega text,
  ADD COLUMN IF NOT EXISTS ventas_actualizado_por text,
  ADD COLUMN IF NOT EXISTS ventas_actualizado_en timestamptz,
  ADD COLUMN IF NOT EXISTS enviado_at timestamptz,
  ADD COLUMN IF NOT EXISTS entregado_at timestamptz;

CREATE INDEX IF NOT EXISTS pedidos_contrato_id_idx ON public.pedidos(contrato_id);