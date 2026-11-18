ALTER TABLE public.inventario
  ADD COLUMN IF NOT EXISTS codigo text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS costo_unitario numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lote text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proveedor text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ubicacion text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;

ALTER TABLE public.inventario_movimientos
  ADD COLUMN IF NOT EXISTS stock_anterior numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_posterior numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referencia_externa text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.inventario_joyas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sede_id uuid REFERENCES public.sedes(id),
  importacion_id text NOT NULL DEFAULT '',
  codigo text NOT NULL DEFAULT '',
  nombre text NOT NULL DEFAULT '',
  metal text NOT NULL DEFAULT '',
  ley text NOT NULL DEFAULT '',
  peso numeric,
  talla text NOT NULL DEFAULT '',
  piedras text NOT NULL DEFAULT '',
  cantidad integer NOT NULL DEFAULT 1,
  estado text NOT NULL DEFAULT 'disponible',
  origen text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventario_joyas TO authenticated;
GRANT ALL ON public.inventario_joyas TO service_role;

ALTER TABLE public.inventario_joyas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventario_joyas_interno" ON public.inventario_joyas;
CREATE POLICY "inventario_joyas_interno" ON public.inventario_joyas
  FOR ALL TO authenticated
  USING (public.es_interno(auth.uid()) AND public.ve_sede(auth.uid(), sede_id))
  WITH CHECK (public.es_interno(auth.uid()) AND public.ve_sede(auth.uid(), sede_id));

DROP TRIGGER IF EXISTS set_inventario_joyas_updated_at ON public.inventario_joyas;
CREATE TRIGGER set_inventario_joyas_updated_at
  BEFORE UPDATE ON public.inventario_joyas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();