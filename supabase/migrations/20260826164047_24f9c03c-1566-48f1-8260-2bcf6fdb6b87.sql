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

INSERT INTO public.pedidos (referencia, pieza, cliente, material, estado, entrega, importe) VALUES
('#4402','Solitario Diamante 1.2ct','Elena Sanz','Oro blanco 18k','Diseño 3D','24 May',3480),
('#4398','Alianza grabada','Julián Ruiz','Oro blanco 18k','Taller / Engaste','Hoy',890),
('#4395','Pendientes esmeralda','Sofía Marín','Oro amarillo 18k','Impresión 3D','28 May',1560),
('#4391','Colgante hexagonal','Nuria Báez','Plata 925','Corte láser','26 May',420),
('#4386','Anillo sello inicial','Jorge Prat','Platino 950','Espera material','02 Jun',2140),
('#4380','Pulsera eslabón','Carmen Vidal','Plata 925','Entregado','09 May',610);

INSERT INTO public.inventario (material, stock, unidad, minimo) VALUES
('Oro 18k amarillo',242,'g',150),
('Oro blanco 18k',168,'g',120),
('Plata de ley 925',45,'g',200),
('Platino 950',96,'g',60),
('Resina castable',840,'ml',500),
('Diamantes brillante',6.4,'ct',3);

INSERT INTO public.procesos (fase, referencia, pieza, cliente, detalle, progreso) VALUES
('diseno','#4402','Solitario Aurora','Elena Sanz','RhinoJewel · v3',72),
('diseno','#4399','Pendiente gota','Rosa Cobo','Modelado orgánico',40),
('diseno','#4404','Collar hilo fino','Lucía Prada','Boceto aprobado',15),
('impresion','#4395','Cera sortija','Sofía Marín','Formlabs 3B+ · resina castable',68),
('impresion','#4392','Soporte gata','Interno','Formlabs 3B+ (B)',25),
('laser','#4391','Base 18k mate','Nuria Báez','Corte terminado',100),
('laser','#4388','Malla cenefa','Marc Soler','Cortando · 0,4 mm',55),
('laser','#4385','Placa grabada','Ana Ferrer','En cola',0);

INSERT INTO public.tareas_taller (tarea, responsable, banco, estado) VALUES
('Engaste solitario 0,52 ct','Marco V.','Banco 1','En curso'),
('Pulido alianza grabada','Irene L.','Banco 2','En curso'),
('Soldadura colgante hexagonal','Pau G.','Banco 3','Pendiente'),
('Fundición al vacío · platino','Marco V.','Fundición','14:30 h');