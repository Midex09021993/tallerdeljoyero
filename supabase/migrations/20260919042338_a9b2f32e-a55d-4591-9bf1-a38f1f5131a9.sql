
CREATE TABLE IF NOT EXISTS public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  telefono text,
  email text,
  estado text NOT NULL DEFAULT 'activo',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY clientes_select ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY clientes_admin_write ON public.clientes FOR ALL TO authenticated USING (public.es_admin(auth.uid())) WITH CHECK (public.es_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.proyectos_joya (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL DEFAULT '',
  nombre text NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  metal text, ley text, peso_estimado numeric, talla text, piedras text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proyectos_joya TO authenticated;
GRANT ALL ON public.proyectos_joya TO service_role;
ALTER TABLE public.proyectos_joya ENABLE ROW LEVEL SECURITY;
CREATE POLICY proyectos_select ON public.proyectos_joya FOR SELECT TO authenticated USING (true);
CREATE POLICY proyectos_admin_write ON public.proyectos_joya FOR ALL TO authenticated USING (public.es_admin(auth.uid())) WITH CHECK (public.es_admin(auth.uid()));

CREATE SEQUENCE IF NOT EXISTS public.cotizaciones_numero_seq START 1;

CREATE TABLE IF NOT EXISTS public.cotizaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL DEFAULT ('COT-' || lpad(nextval('public.cotizaciones_numero_seq')::text, 5, '0')),
  version integer NOT NULL DEFAULT 1,
  estado text NOT NULL DEFAULT 'borrador',
  fecha_emision date NOT NULL DEFAULT current_date,
  fecha_vencimiento date,
  fecha_entrega_solicitada date,
  moneda text NOT NULL DEFAULT 'PEN',
  subtotal_costo numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  descuento numeric NOT NULL DEFAULT 0,
  impuestos numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  anticipo numeric NOT NULL DEFAULT 0,
  notas_cliente text NOT NULL DEFAULT '',
  notas_internas text NOT NULL DEFAULT '',
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  proyecto_joya_id uuid REFERENCES public.proyectos_joya(id) ON DELETE SET NULL,
  sede_id uuid REFERENCES public.sedes(id) ON DELETE SET NULL,
  creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotizaciones TO authenticated;
GRANT ALL ON public.cotizaciones TO service_role;
GRANT USAGE ON SEQUENCE public.cotizaciones_numero_seq TO authenticated;
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY cotizaciones_select ON public.cotizaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY cotizaciones_admin_write ON public.cotizaciones FOR ALL TO authenticated USING (public.es_admin(auth.uid())) WITH CHECK (public.es_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.cotizacion_detalles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id uuid NOT NULL REFERENCES public.cotizaciones(id) ON DELETE CASCADE,
  orden integer NOT NULL DEFAULT 1,
  tipo text NOT NULL DEFAULT 'otro',
  descripcion text NOT NULL DEFAULT '',
  cantidad numeric NOT NULL DEFAULT 1,
  unidad text NOT NULL DEFAULT 'und',
  costo_unitario numeric NOT NULL DEFAULT 0,
  precio_unitario numeric NOT NULL DEFAULT 0,
  total_costo numeric NOT NULL DEFAULT 0,
  total_precio numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotizacion_detalles TO authenticated;
GRANT ALL ON public.cotizacion_detalles TO service_role;
ALTER TABLE public.cotizacion_detalles ENABLE ROW LEVEL SECURITY;
CREATE POLICY cotdet_select ON public.cotizacion_detalles FOR SELECT TO authenticated USING (true);
CREATE POLICY cotdet_admin_write ON public.cotizacion_detalles FOR ALL TO authenticated USING (public.es_admin(auth.uid())) WITH CHECK (public.es_admin(auth.uid()));

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS cotizacion_id uuid REFERENCES public.cotizaciones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proyecto_joya_id uuid REFERENCES public.proyectos_joya(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cotizacion_detalles jsonb,
  ADD COLUMN IF NOT EXISTS especificaciones_comerciales jsonb;

CREATE OR REPLACE FUNCTION public.cambiar_estado_cotizacion(_cotizacion_id uuid, _nuevo_estado text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.es_admin(auth.uid()) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF _nuevo_estado NOT IN ('borrador','enviada','aprobada','rechazada','vencida','cancelada') THEN
    RAISE EXCEPTION 'Estado no válido';
  END IF;
  UPDATE public.cotizaciones SET estado = _nuevo_estado, updated_at = now() WHERE id = _cotizacion_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.cambiar_estado_cotizacion(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.cambiar_estado_cotizacion(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.guardar_detalles_cotizacion(_cotizacion_id uuid, _detalles jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v record;
BEGIN
  IF NOT public.es_admin(auth.uid()) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  DELETE FROM public.cotizacion_detalles WHERE cotizacion_id = _cotizacion_id;
  FOR v IN SELECT * FROM jsonb_array_elements(_detalles) LOOP
    INSERT INTO public.cotizacion_detalles (cotizacion_id, orden, tipo, descripcion, cantidad, unidad, costo_unitario, precio_unitario, total_costo, total_precio)
    VALUES (
      _cotizacion_id,
      COALESCE((v.value->>'orden')::int, 1),
      COALESCE(v.value->>'tipo', 'otro'),
      COALESCE(v.value->>'descripcion', ''),
      COALESCE((v.value->>'cantidad')::numeric, 1),
      COALESCE(v.value->>'unidad', 'und'),
      COALESCE((v.value->>'costo_unitario')::numeric, 0),
      COALESCE((v.value->>'precio_unitario')::numeric, 0),
      COALESCE((v.value->>'cantidad')::numeric, 1) * COALESCE((v.value->>'costo_unitario')::numeric, 0),
      COALESCE((v.value->>'cantidad')::numeric, 1) * COALESCE((v.value->>'precio_unitario')::numeric, 0)
    );
  END LOOP;
  UPDATE public.cotizaciones q SET
    subtotal_costo = COALESCE((SELECT sum(total_costo) FROM public.cotizacion_detalles WHERE cotizacion_id = q.id), 0),
    subtotal = COALESCE((SELECT sum(total_precio) FROM public.cotizacion_detalles WHERE cotizacion_id = q.id), 0),
    total = GREATEST(0, COALESCE((SELECT sum(total_precio) FROM public.cotizacion_detalles WHERE cotizacion_id = q.id), 0) - q.descuento + q.impuestos),
    updated_at = now()
  WHERE q.id = _cotizacion_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.guardar_detalles_cotizacion(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.guardar_detalles_cotizacion(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.crear_version_cotizacion(_cotizacion_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nuevo_id uuid;
BEGIN
  IF NOT public.es_admin(auth.uid()) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  INSERT INTO public.cotizaciones (numero, version, estado, fecha_emision, fecha_vencimiento, fecha_entrega_solicitada, moneda, subtotal_costo, subtotal, descuento, impuestos, total, anticipo, notas_cliente, notas_internas, cliente_id, proyecto_joya_id, sede_id, creado_por)
  SELECT numero, version + 1, 'borrador', current_date, fecha_vencimiento, fecha_entrega_solicitada, moneda, subtotal_costo, subtotal, descuento, impuestos, total, 0, notas_cliente, notas_internas, cliente_id, proyecto_joya_id, sede_id, auth.uid()
  FROM public.cotizaciones WHERE id = _cotizacion_id
  RETURNING id INTO nuevo_id;
  IF nuevo_id IS NULL THEN RAISE EXCEPTION 'Cotización no encontrada'; END IF;
  INSERT INTO public.cotizacion_detalles (cotizacion_id, orden, tipo, descripcion, cantidad, unidad, costo_unitario, precio_unitario, total_costo, total_precio)
  SELECT nuevo_id, orden, tipo, descripcion, cantidad, unidad, costo_unitario, precio_unitario, total_costo, total_precio
  FROM public.cotizacion_detalles WHERE cotizacion_id = _cotizacion_id;
  RETURN nuevo_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.crear_version_cotizacion(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.crear_version_cotizacion(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.convertir_cotizacion_a_pedido_contrato(_cotizacion_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  q public.cotizaciones%ROWTYPE;
  cli public.clientes%ROWTYPE;
  proy public.proyectos_joya%ROWTYPE;
  detalles jsonb;
  v_contrato_id uuid;
  v_contrato_numero text;
  v_pedido_id uuid;
  v_referencia text;
  v_descripcion text;
BEGIN
  IF NOT public.es_admin(auth.uid()) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT * INTO q FROM public.cotizaciones WHERE id = _cotizacion_id;
  IF q.id IS NULL THEN RAISE EXCEPTION 'Cotización no encontrada'; END IF;
  IF q.estado <> 'aprobada' THEN RAISE EXCEPTION 'La cotización debe estar aprobada'; END IF;
  IF EXISTS (SELECT 1 FROM public.pedidos WHERE cotizacion_id = q.id) THEN
    RAISE EXCEPTION 'Esta cotización ya fue convertida';
  END IF;
  SELECT * INTO cli FROM public.clientes WHERE id = q.cliente_id;
  SELECT * INTO proy FROM public.proyectos_joya WHERE id = q.proyecto_joya_id;
  SELECT COALESCE(jsonb_agg(to_jsonb(d) ORDER BY d.orden), '[]'::jsonb) INTO detalles
  FROM public.cotizacion_detalles d WHERE d.cotizacion_id = q.id;
  SELECT string_agg(d.descripcion, ' · ' ORDER BY d.orden) INTO v_descripcion
  FROM public.cotizacion_detalles d WHERE d.cotizacion_id = q.id;

  v_contrato_numero := 'CT-' || q.numero || '-V' || q.version;
  INSERT INTO public.contratos (numero, cliente, telefono, origen, total, abonado, sede_id, notas)
  VALUES (v_contrato_numero, COALESCE(cli.nombre, 'Cliente'), COALESCE(cli.telefono, ''), 'Cotización ' || q.numero, q.total, q.anticipo, q.sede_id, q.notas_internas)
  RETURNING id INTO v_contrato_id;

  v_referencia := q.numero || '-V' || q.version || '-01';
  INSERT INTO public.pedidos (
    referencia, pieza, cliente, material, estado, entrega, importe, sede_id, telefono, origen,
    contrato, contrato_id, cotizacion_id, proyecto_joya_id, cotizacion_detalles, especificaciones_comerciales,
    trabajo, fecha_ingreso, fecha_entrega, area_actual, ruta, area_desde, notas, talla,
    cantidad_piezas, piedras, peso_estimado, ventas_estado, packing_estado, medio_envio,
    guia_envio, receptor_envio, notas_ventas, corte_texto, corte_tipografia, corte_ubicacion, corte_observaciones
  ) VALUES (
    v_referencia,
    COALESCE(proy.nombre, v_descripcion, 'Trabajo de joyería'),
    COALESCE(cli.nombre, 'Cliente'),
    COALESCE(nullif(trim(concat_ws(' ', proy.metal, proy.ley)), ''), 'Por definir'),
    'Recibido',
    COALESCE(q.fecha_entrega_solicitada::text, ''),
    q.total,
    q.sede_id,
    COALESCE(cli.telefono, ''),
    'Cotización ' || q.numero,
    v_contrato_numero, v_contrato_id, q.id, q.proyecto_joya_id, detalles,
    jsonb_build_object('moneda', q.moneda, 'descuento', q.descuento, 'impuestos', q.impuestos, 'anticipo', q.anticipo),
    COALESCE(v_descripcion, 'Trabajo de joyería'),
    current_date, q.fecha_entrega_solicitada, 'Pedidos', ARRAY['Pedidos'], now(), q.notas_cliente,
    COALESCE(proy.talla, ''), 1, COALESCE(proy.piedras, ''), COALESCE(proy.peso_estimado::text, ''),
    '', '', '', '', '', '', '', '', '', ''
  ) RETURNING id INTO v_pedido_id;

  RETURN jsonb_build_object('pedido_id', v_pedido_id, 'contrato_id', v_contrato_id, 'contrato_numero', v_contrato_numero);
END $$;
REVOKE EXECUTE ON FUNCTION public.convertir_cotizacion_a_pedido_contrato(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.convertir_cotizacion_a_pedido_contrato(uuid) TO authenticated;
