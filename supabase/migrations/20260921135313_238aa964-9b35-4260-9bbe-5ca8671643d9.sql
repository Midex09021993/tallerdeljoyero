-- 1. QR de joyas
ALTER TABLE public.inventario_joyas
  ADD COLUMN IF NOT EXISTS qr_token text NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex');
CREATE UNIQUE INDEX IF NOT EXISTS inventario_joyas_qr_token_key ON public.inventario_joyas (qr_token);

-- 2. Historial de joyas
CREATE TABLE IF NOT EXISTS public.inventario_joya_eventos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  joya_id uuid NOT NULL REFERENCES public.inventario_joyas(id) ON DELETE CASCADE,
  sede_id uuid,
  tipo text NOT NULL DEFAULT 'nota',
  estado_anterior text,
  estado_nuevo text,
  nota text,
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventario_joya_eventos_joya_idx ON public.inventario_joya_eventos (joya_id, created_at DESC);
GRANT SELECT, INSERT ON public.inventario_joya_eventos TO authenticated;
GRANT ALL ON public.inventario_joya_eventos TO service_role;
ALTER TABLE public.inventario_joya_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventario_joya_eventos_select ON public.inventario_joya_eventos;
CREATE POLICY inventario_joya_eventos_select ON public.inventario_joya_eventos
  FOR SELECT TO authenticated
  USING (es_interno(auth.uid()) AND ve_sede(auth.uid(), sede_id));
DROP POLICY IF EXISTS inventario_joya_eventos_insert ON public.inventario_joya_eventos;
CREATE POLICY inventario_joya_eventos_insert ON public.inventario_joya_eventos
  FOR INSERT TO authenticated
  WITH CHECK (es_interno(auth.uid()) AND ve_sede(auth.uid(), sede_id) AND usuario_id = auth.uid());

-- 3. Historial de produccion
CREATE TABLE IF NOT EXISTS public.produccion_eventos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id uuid REFERENCES public.pedidos(id) ON DELETE CASCADE,
  orden_produccion_id uuid REFERENCES public.ordenes_produccion(id) ON DELETE SET NULL,
  trabajo_id uuid REFERENCES public.trabajos(id) ON DELETE SET NULL,
  sede_id uuid,
  tipo text NOT NULL,
  estado_anterior text,
  estado_nuevo text,
  usuario_id uuid,
  datos jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS produccion_eventos_pedido_idx ON public.produccion_eventos (pedido_id, created_at DESC);
GRANT SELECT, INSERT ON public.produccion_eventos TO authenticated;
GRANT ALL ON public.produccion_eventos TO service_role;
ALTER TABLE public.produccion_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS produccion_eventos_select ON public.produccion_eventos;
CREATE POLICY produccion_eventos_select ON public.produccion_eventos
  FOR SELECT TO authenticated
  USING (es_interno(auth.uid()) AND ve_sede(auth.uid(), sede_id));
DROP POLICY IF EXISTS produccion_eventos_insert ON public.produccion_eventos;
CREATE POLICY produccion_eventos_insert ON public.produccion_eventos
  FOR INSERT TO authenticated
  WITH CHECK (es_interno(auth.uid()) AND ve_sede(auth.uid(), sede_id) AND usuario_id = auth.uid());

-- 4. Consulta publica de joya por QR
CREATE OR REPLACE FUNCTION public.consultar_joya_publica(_token text)
RETURNS TABLE (
  id uuid, codigo text, nombre text, taller text, metal text,
  ley text, peso numeric, talla text, piedras text, estado text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT j.id, j.codigo, j.nombre, COALESCE(s.nombre, 'Taller del Joyero'),
         COALESCE(j.metal, ''), COALESCE(j.ley, ''), j.peso,
         COALESCE(j.talla, ''), COALESCE(j.piedras, ''), COALESCE(j.estado, '')
  FROM public.inventario_joyas j
  LEFT JOIN public.sedes s ON s.id = j.sede_id
  WHERE j.qr_token = _token
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.consultar_joya_publica(text) TO anon, authenticated;

-- 5. Crear cotizacion comercial
CREATE OR REPLACE FUNCTION public.crear_cotizacion_comercial(
  _cliente_id uuid,
  _cliente_nombre text,
  _cliente_telefono text,
  _cliente_email text,
  _proyecto_joya_id uuid,
  _sede_id uuid,
  _moneda text,
  _cantidad numeric,
  _costo_unitario numeric,
  _precio_unitario numeric,
  _descuento numeric,
  _impuestos numeric,
  _fecha_vencimiento date,
  _fecha_entrega_solicitada date,
  _notas_cliente text,
  _notas_internas text,
  _descripcion text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cliente uuid := _cliente_id;
  v_cotizacion uuid;
  v_numero text;
  v_cantidad numeric := GREATEST(COALESCE(_cantidad, 1), 1);
  v_subtotal numeric;
  v_subtotal_costo numeric;
  v_total numeric;
BEGIN
  IF NOT es_interno(auth.uid()) THEN
    RAISE EXCEPTION 'No tienes permiso para crear cotizaciones';
  END IF;

  IF v_cliente IS NULL THEN
    IF COALESCE(btrim(_cliente_nombre), '') = '' THEN
      RAISE EXCEPTION 'Indica el cliente de la cotización';
    END IF;
    INSERT INTO public.clientes (nombre, telefono, email, estado, sede_id)
    VALUES (btrim(_cliente_nombre), _cliente_telefono, _cliente_email, 'activo', _sede_id)
    RETURNING id INTO v_cliente;
  END IF;

  v_subtotal := COALESCE(_precio_unitario, 0) * v_cantidad;
  v_subtotal_costo := COALESCE(_costo_unitario, 0) * v_cantidad;
  v_total := GREATEST(v_subtotal - COALESCE(_descuento, 0), 0) + COALESCE(_impuestos, 0);

  SELECT 'COT-' || to_char(now(), 'YYYY') || '-' || lpad((COUNT(*) + 1)::text, 4, '0')
    INTO v_numero
  FROM public.cotizaciones
  WHERE date_part('year', created_at) = date_part('year', now());

  INSERT INTO public.cotizaciones (
    numero, version, estado, fecha_emision, fecha_vencimiento, fecha_entrega_solicitada,
    moneda, subtotal_costo, subtotal, descuento, impuestos, total,
    notas_cliente, notas_internas, cliente_id, proyecto_joya_id, sede_id, creado_por
  ) VALUES (
    v_numero, 1, 'borrador', current_date, _fecha_vencimiento, _fecha_entrega_solicitada,
    COALESCE(_moneda, 'PEN'), v_subtotal_costo, v_subtotal, COALESCE(_descuento, 0),
    COALESCE(_impuestos, 0), v_total,
    _notas_cliente, _notas_internas, v_cliente, _proyecto_joya_id, _sede_id, auth.uid()
  )
  RETURNING id INTO v_cotizacion;

  INSERT INTO public.cotizacion_detalles (
    cotizacion_id, orden, tipo, descripcion, cantidad, unidad,
    costo_unitario, precio_unitario, total_costo, total_precio
  ) VALUES (
    v_cotizacion, 1, 'pieza', COALESCE(_descripcion, 'Trabajo de joyería'), v_cantidad, 'und',
    COALESCE(_costo_unitario, 0), COALESCE(_precio_unitario, 0), v_subtotal_costo, v_subtotal
  );

  RETURN v_cotizacion;
END;
$$;
GRANT EXECUTE ON FUNCTION public.crear_cotizacion_comercial(uuid, text, text, text, uuid, uuid, text, numeric, numeric, numeric, numeric, numeric, date, date, text, text, text) TO authenticated;

-- 6. Preparar produccion de un pedido
CREATE OR REPLACE FUNCTION public.preparar_produccion_pedido(_pedido_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_pedido public.pedidos;
  v_orden public.ordenes_produccion;
  v_numero text;
  v_trabajos integer := 0;
  v_piezas integer := 0;
  v_cantidad integer;
  i integer;
BEGIN
  SELECT * INTO v_pedido FROM public.pedidos WHERE id = _pedido_id;
  IF v_pedido.id IS NULL THEN
    RAISE EXCEPTION 'Pedido no encontrado';
  END IF;
  IF NOT es_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo un administrador puede preparar la producción';
  END IF;

  SELECT * INTO v_orden FROM public.ordenes_produccion
  WHERE pedido_id = _pedido_id ORDER BY created_at LIMIT 1;

  IF v_orden.id IS NULL THEN
    SELECT 'OP-' || to_char(now(), 'YYYY') || '-' || lpad((COUNT(*) + 1)::text, 4, '0')
      INTO v_numero
    FROM public.ordenes_produccion
    WHERE date_part('year', created_at) = date_part('year', now());

    INSERT INTO public.ordenes_produccion (pedido_id, sede_id, numero, estado, prioridad, creado_por)
    VALUES (_pedido_id, v_pedido.sede_id, v_numero, 'planificada', 'normal', auth.uid())
    RETURNING * INTO v_orden;
  END IF;

  UPDATE public.trabajos
     SET orden_produccion_id = v_orden.id
   WHERE pedido_id = _pedido_id AND orden_produccion_id IS NULL;
  SELECT COUNT(*) INTO v_trabajos FROM public.trabajos WHERE orden_produccion_id = v_orden.id;

  SELECT COUNT(*) INTO v_piezas FROM public.piezas_terminadas WHERE orden_produccion_id = v_orden.id;
  IF v_piezas = 0 THEN
    v_cantidad := GREATEST(COALESCE(v_pedido.cantidad_piezas, 1), 1);
    FOR i IN 1..v_cantidad LOOP
      INSERT INTO public.piezas_terminadas (
        orden_produccion_id, pedido_id, numero_pieza, cantidad, estado,
        metal_estimado, piedras_estimadas, registrado_por
      ) VALUES (
        v_orden.id, _pedido_id, v_orden.numero || '-' || lpad(i::text, 2, '0'), 1, 'pendiente',
        v_pedido.material, v_pedido.piedras, auth.uid()
      );
    END LOOP;
    v_piezas := v_cantidad;
  END IF;

  INSERT INTO public.produccion_eventos (pedido_id, orden_produccion_id, sede_id, tipo, estado_nuevo, usuario_id, datos)
  VALUES (_pedido_id, v_orden.id, v_pedido.sede_id, 'produccion_preparada', v_orden.estado, auth.uid(),
          jsonb_build_object('numero', v_orden.numero, 'trabajos', v_trabajos, 'piezas', v_piezas));

  RETURN jsonb_build_object('orden_id', v_orden.id, 'numero', v_orden.numero, 'trabajos', v_trabajos, 'piezas', v_piezas);
END;
$$;
GRANT EXECUTE ON FUNCTION public.preparar_produccion_pedido(uuid) TO authenticated;
