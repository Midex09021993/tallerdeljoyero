
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clientes(id);

CREATE TABLE IF NOT EXISTS public.pedido_comercial (
  pedido_id uuid PRIMARY KEY REFERENCES public.pedidos(id) ON DELETE CASCADE,
  telefono text NOT NULL DEFAULT '',
  importe numeric NOT NULL DEFAULT 0,
  a_cuenta numeric NOT NULL DEFAULT 0,
  saldo numeric NOT NULL DEFAULT 0,
  cotizacion_detalles jsonb NOT NULL DEFAULT '[]'::jsonb,
  especificaciones_comerciales jsonb NOT NULL DEFAULT '{}'::jsonb,
  ventas_estado text NOT NULL DEFAULT '',
  packing_estado text NOT NULL DEFAULT '',
  medio_envio text NOT NULL DEFAULT '',
  guia_envio text NOT NULL DEFAULT '',
  fecha_envio date,
  fecha_entregado date,
  receptor_envio text NOT NULL DEFAULT '',
  notas_ventas text NOT NULL DEFAULT '',
  fecha_listo_entrega timestamptz,
  listo_entrega_observaciones text NOT NULL DEFAULT '',
  notas_envio text NOT NULL DEFAULT '',
  notas_entrega text NOT NULL DEFAULT '',
  usuario_listo_entrega text NOT NULL DEFAULT '',
  usuario_envio text NOT NULL DEFAULT '',
  usuario_entrega text NOT NULL DEFAULT '',
  ventas_actualizado_por text NOT NULL DEFAULT '',
  ventas_actualizado_en timestamptz,
  enviado_at timestamptz,
  entregado_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedido_comercial TO authenticated;
GRANT ALL ON public.pedido_comercial TO service_role;

ALTER TABLE public.pedido_comercial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pedido_comercial_select" ON public.pedido_comercial;
CREATE POLICY "pedido_comercial_select" ON public.pedido_comercial FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pedidos p
  WHERE p.id = pedido_comercial.pedido_id AND public.ve_sede(auth.uid(), p.sede_id)
));

DROP POLICY IF EXISTS "pedido_comercial_write" ON public.pedido_comercial;
CREATE POLICY "pedido_comercial_write" ON public.pedido_comercial FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pedidos p
  WHERE p.id = pedido_comercial.pedido_id AND public.ve_sede(auth.uid(), p.sede_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.pedidos p
  WHERE p.id = pedido_comercial.pedido_id AND public.ve_sede(auth.uid(), p.sede_id)
));

INSERT INTO public.pedido_comercial (
  pedido_id, telefono, importe, a_cuenta, saldo, cotizacion_detalles, especificaciones_comerciales,
  ventas_estado, packing_estado, medio_envio, guia_envio, fecha_envio, fecha_entregado, receptor_envio,
  notas_ventas, fecha_listo_entrega, listo_entrega_observaciones, notas_envio, notas_entrega,
  usuario_listo_entrega, usuario_envio, usuario_entrega, ventas_actualizado_por, ventas_actualizado_en,
  enviado_at, entregado_at
)
SELECT
  p.id, COALESCE(p.telefono,''), COALESCE(p.importe,0), COALESCE(p.a_cuenta,0), COALESCE(p.saldo,0),
  COALESCE(p.cotizacion_detalles,'[]'::jsonb), COALESCE(p.especificaciones_comerciales,'{}'::jsonb),
  COALESCE(p.ventas_estado,''), COALESCE(p.packing_estado,''), COALESCE(p.medio_envio,''),
  COALESCE(p.guia_envio,''), p.fecha_envio, p.fecha_entregado, COALESCE(p.receptor_envio,''),
  COALESCE(p.notas_ventas,''), p.fecha_listo_entrega, COALESCE(p.listo_entrega_observaciones,''),
  COALESCE(p.notas_envio,''), COALESCE(p.notas_entrega,''), COALESCE(p.usuario_listo_entrega,''),
  COALESCE(p.usuario_envio,''), COALESCE(p.usuario_entrega,''), COALESCE(p.ventas_actualizado_por,''),
  p.ventas_actualizado_en, p.enviado_at, p.entregado_at
FROM public.pedidos p
ON CONFLICT (pedido_id) DO NOTHING;
