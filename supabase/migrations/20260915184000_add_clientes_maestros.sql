-- Clientes maestros del ERP de joyería
CREATE TABLE IF NOT EXISTS public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  documento text NOT NULL DEFAULT '',
  telefono text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  direccion text NOT NULL DEFAULT '',
  ciudad text NOT NULL DEFAULT '',
  notas text NOT NULL DEFAULT '',
  sede_id uuid REFERENCES public.sedes(id) ON DELETE SET NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clientes_nombre_idx ON public.clientes (lower(nombre));
CREATE INDEX IF NOT EXISTS clientes_documento_idx ON public.clientes (documento);
CREATE INDEX IF NOT EXISTS clientes_sede_id_idx ON public.clientes (sede_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_select" ON public.clientes FOR SELECT TO authenticated
  USING (public.ve_sede(auth.uid(), sede_id));
CREATE POLICY "clientes_insert" ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (public.ve_sede(auth.uid(), sede_id));
CREATE POLICY "clientes_update" ON public.clientes FOR UPDATE TO authenticated
  USING (public.ve_sede(auth.uid(), sede_id));
CREATE POLICY "clientes_delete" ON public.clientes FOR DELETE TO authenticated
  USING (public.es_admin(auth.uid()));

CREATE TRIGGER clientes_updated_at BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS pedidos_cliente_id_idx ON public.pedidos (cliente_id);
