CREATE TABLE public.pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia text NOT NULL,
  pieza text NOT NULL,
  cliente text NOT NULL,
  material text NOT NULL,
  estado text NOT NULL DEFAULT 'Diseño 3D',
  entrega text NOT NULL DEFAULT '',
  importe numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.inventario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material text NOT NULL,
  stock numeric NOT NULL DEFAULT 0,
  unidad text NOT NULL DEFAULT 'g',
  minimo numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.procesos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fase text NOT NULL,
  referencia text NOT NULL,
  pieza text NOT NULL,
  cliente text NOT NULL DEFAULT '',
  detalle text NOT NULL DEFAULT '',
  progreso integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tareas_taller (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea text NOT NULL,
  responsable text NOT NULL DEFAULT '',
  banco text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'Pendiente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventario TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procesos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tareas_taller TO anon, authenticated;
GRANT ALL ON public.pedidos TO service_role;
GRANT ALL ON public.inventario TO service_role;
GRANT ALL ON public.procesos TO service_role;
GRANT ALL ON public.tareas_taller TO service_role;

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procesos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas_taller ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Taller abierto pedidos" ON public.pedidos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Taller abierto inventario" ON public.inventario FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Taller abierto procesos" ON public.procesos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Taller abierto tareas" ON public.tareas_taller FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER pedidos_updated_at BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER inventario_updated_at BEFORE UPDATE ON public.inventario FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER procesos_updated_at BEFORE UPDATE ON public.procesos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tareas_updated_at BEFORE UPDATE ON public.tareas_taller FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
