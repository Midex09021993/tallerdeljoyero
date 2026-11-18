ALTER TABLE public.inventario ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'Otros insumos';
ALTER TABLE public.inventario_movimientos ADD COLUMN IF NOT EXISTS area text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.material_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.inventario(id) ON DELETE CASCADE,
  area text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (material_id, area)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_areas TO authenticated;
GRANT ALL ON public.material_areas TO service_role;
ALTER TABLE public.material_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "material areas por sede" ON public.material_areas FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.inventario m WHERE m.id = material_areas.material_id AND public.ve_sede(auth.uid(), m.sede_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.inventario m WHERE m.id = material_areas.material_id AND public.ve_sede(auth.uid(), m.sede_id)));

CREATE OR REPLACE FUNCTION public.aplicar_movimiento_inventario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE public.inventario SET stock = stock + abs(NEW.cantidad) WHERE id = NEW.material_id;
  ELSE
    UPDATE public.inventario SET stock = stock - abs(NEW.cantidad) WHERE id = NEW.material_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mov_inventario_aplica ON public.inventario_movimientos;
CREATE TRIGGER mov_inventario_aplica
AFTER INSERT ON public.inventario_movimientos
FOR EACH ROW EXECUTE FUNCTION public.aplicar_movimiento_inventario();