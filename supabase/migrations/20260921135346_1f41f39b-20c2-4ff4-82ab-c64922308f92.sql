ALTER TABLE public.produccion_eventos
  ADD COLUMN IF NOT EXISTS pieza_id uuid REFERENCES public.piezas_terminadas(id) ON DELETE SET NULL;
