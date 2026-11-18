-- ============ SEDES ============
CREATE TABLE public.sedes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  ciudad text NOT NULL DEFAULT '',
  modo text NOT NULL DEFAULT 'completo',
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sedes TO authenticated;
GRANT ALL ON public.sedes TO service_role;
ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;

INSERT INTO public.sedes (nombre, ciudad, modo) VALUES
  ('Gerencia general', 'Trujillo', 'completo'),
  ('Yamanik', 'Trujillo', 'completo');

-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('dueno', 'gerente', 'operario', 'monitor', 'cliente');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL DEFAULT '',
  dni text NOT NULL DEFAULT '',
  telefono text NOT NULL DEFAULT '',
  sede_id uuid REFERENCES public.sedes(id) ON DELETE SET NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  sede_id uuid REFERENCES public.sedes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, sede_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, area)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_areas TO authenticated;
GRANT ALL ON public.user_areas TO service_role;
ALTER TABLE public.user_areas ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.es_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('dueno','gerente'))
$$;

CREATE OR REPLACE FUNCTION public.mi_sede(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT sede_id FROM public.profiles WHERE id = _user_id
$$;

-- ve_sede: dueño ve todas; el resto sólo la suya
CREATE OR REPLACE FUNCTION public.ve_sede(_user_id uuid, _sede_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'dueno')
     OR _sede_id IS NULL
     OR _sede_id = public.mi_sede(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, dni, telefono)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nombre', NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'dni', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'telefono', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER sedes_updated_at BEFORE UPDATE ON public.sedes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PEDIDOS AMPLIADOS ============
ALTER TABLE public.pedidos
  ADD COLUMN sede_id uuid REFERENCES public.sedes(id) ON DELETE SET NULL,
  ADD COLUMN telefono text NOT NULL DEFAULT '',
  ADD COLUMN origen text NOT NULL DEFAULT '',
  ADD COLUMN contrato text NOT NULL DEFAULT '',
  ADD COLUMN trabajo text NOT NULL DEFAULT '',
  ADD COLUMN fecha_ingreso date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN fecha_entrega date,
  ADD COLUMN area_actual text NOT NULL DEFAULT 'Pedidos',
  ADD COLUMN ruta text[] NOT NULL DEFAULT ARRAY['Diseño 3D','Impresión 3D','Casting','Taller','Área ventas']::text[],
  ADD COLUMN area_desde timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN notas text NOT NULL DEFAULT '';

UPDATE public.pedidos
SET sede_id = (SELECT id FROM public.sedes WHERE nombre = 'Gerencia general'),
    trabajo = pieza,
    area_actual = CASE
      WHEN estado = 'Diseño 3D' THEN 'Diseño 3D'
      WHEN estado = 'Impresión 3D' THEN 'Impresión 3D'
      WHEN estado = 'Corte láser' THEN 'Servicio láser'
      WHEN estado = 'Taller / Engaste' THEN 'Taller'
      WHEN estado = 'Entregado' THEN 'Entregado'
      ELSE 'Pedidos'
    END;

CREATE TABLE public.pedido_archivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'archivo',
  nombre text NOT NULL DEFAULT '',
  url text NOT NULL,
  es_enlace boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedido_archivos TO authenticated;
GRANT ALL ON public.pedido_archivos TO service_role;
ALTER TABLE public.pedido_archivos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pedido_movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  area_origen text NOT NULL DEFAULT '',
  area_destino text NOT NULL,
  accion text NOT NULL DEFAULT 'avanzar',
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nota text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedido_movimientos TO authenticated;
GRANT ALL ON public.pedido_movimientos TO service_role;
ALTER TABLE public.pedido_movimientos ENABLE ROW LEVEL SECURITY;

-- ============ SEDE EN TABLAS EXISTENTES ============
ALTER TABLE public.inventario ADD COLUMN sede_id uuid REFERENCES public.sedes(id) ON DELETE SET NULL;
ALTER TABLE public.procesos ADD COLUMN sede_id uuid REFERENCES public.sedes(id) ON DELETE SET NULL;
ALTER TABLE public.tareas_taller ADD COLUMN sede_id uuid REFERENCES public.sedes(id) ON DELETE SET NULL;
UPDATE public.inventario SET sede_id = (SELECT id FROM public.sedes WHERE nombre = 'Gerencia general');
UPDATE public.procesos SET sede_id = (SELECT id FROM public.sedes WHERE nombre = 'Gerencia general');
UPDATE public.tareas_taller SET sede_id = (SELECT id FROM public.sedes WHERE nombre = 'Gerencia general');

CREATE TABLE public.inventario_movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.inventario(id) ON DELETE CASCADE,
  cantidad numeric NOT NULL,
  tipo text NOT NULL DEFAULT 'entrada',
  motivo text NOT NULL DEFAULT '',
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventario_movimientos TO authenticated;
GRANT ALL ON public.inventario_movimientos TO service_role;
ALTER TABLE public.inventario_movimientos ENABLE ROW LEVEL SECURITY;

-- ============ POLITICAS ============
DROP POLICY IF EXISTS "Taller abierto pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Taller abierto inventario" ON public.inventario;
DROP POLICY IF EXISTS "Taller abierto procesos" ON public.procesos;
DROP POLICY IF EXISTS "Taller abierto tareas" ON public.tareas_taller;

REVOKE ALL ON public.pedidos FROM anon;
REVOKE ALL ON public.inventario FROM anon;
REVOKE ALL ON public.procesos FROM anon;
REVOKE ALL ON public.tareas_taller FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventario TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procesos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tareas_taller TO authenticated;

CREATE POLICY "sedes visibles" ON public.sedes FOR SELECT TO authenticated
  USING (public.ve_sede(auth.uid(), id));
CREATE POLICY "sedes admin" ON public.sedes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'dueno')) WITH CHECK (public.has_role(auth.uid(), 'dueno'));

CREATE POLICY "perfil propio" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.es_admin(auth.uid()));
CREATE POLICY "editar perfil propio" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.es_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.es_admin(auth.uid()));
CREATE POLICY "perfiles admin" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.es_admin(auth.uid()));
CREATE POLICY "perfiles borrar admin" ON public.profiles FOR DELETE TO authenticated
  USING (public.es_admin(auth.uid()));

CREATE POLICY "roles propios" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.es_admin(auth.uid()));
CREATE POLICY "roles admin" ON public.user_roles FOR ALL TO authenticated
  USING (public.es_admin(auth.uid())) WITH CHECK (public.es_admin(auth.uid()));

CREATE POLICY "areas propias" ON public.user_areas FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.es_admin(auth.uid()));
CREATE POLICY "areas admin" ON public.user_areas FOR ALL TO authenticated
  USING (public.es_admin(auth.uid())) WITH CHECK (public.es_admin(auth.uid()));

CREATE POLICY "pedidos por sede" ON public.pedidos FOR SELECT TO authenticated
  USING (public.ve_sede(auth.uid(), sede_id));
CREATE POLICY "pedidos editar" ON public.pedidos FOR UPDATE TO authenticated
  USING (public.ve_sede(auth.uid(), sede_id)) WITH CHECK (public.ve_sede(auth.uid(), sede_id));
CREATE POLICY "pedidos crear" ON public.pedidos FOR INSERT TO authenticated
  WITH CHECK (public.es_admin(auth.uid()) AND public.ve_sede(auth.uid(), sede_id));
CREATE POLICY "pedidos borrar" ON public.pedidos FOR DELETE TO authenticated
  USING (public.es_admin(auth.uid()) AND public.ve_sede(auth.uid(), sede_id));

CREATE POLICY "archivos pedido" ON public.pedido_archivos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND public.ve_sede(auth.uid(), p.sede_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND public.ve_sede(auth.uid(), p.sede_id)));

CREATE POLICY "movimientos pedido" ON public.pedido_movimientos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND public.ve_sede(auth.uid(), p.sede_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND public.ve_sede(auth.uid(), p.sede_id)));

CREATE POLICY "inventario por sede" ON public.inventario FOR ALL TO authenticated
  USING (public.ve_sede(auth.uid(), sede_id)) WITH CHECK (public.ve_sede(auth.uid(), sede_id));
CREATE POLICY "procesos por sede" ON public.procesos FOR ALL TO authenticated
  USING (public.ve_sede(auth.uid(), sede_id)) WITH CHECK (public.ve_sede(auth.uid(), sede_id));
CREATE POLICY "tareas por sede" ON public.tareas_taller FOR ALL TO authenticated
  USING (public.ve_sede(auth.uid(), sede_id)) WITH CHECK (public.ve_sede(auth.uid(), sede_id));

CREATE POLICY "mov inventario" ON public.inventario_movimientos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inventario m WHERE m.id = material_id AND public.ve_sede(auth.uid(), m.sede_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.inventario m WHERE m.id = material_id AND public.ve_sede(auth.uid(), m.sede_id)));