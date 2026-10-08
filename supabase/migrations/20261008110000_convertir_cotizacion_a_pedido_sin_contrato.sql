-- Fase comercial 2: una cotización aprobada puede convertirse en pedido sin crear contrato.
-- Los contratos Aurum quedan como documento opcional y se crean por separado.

CREATE OR REPLACE FUNCTION public.convertir_cotizacion_a_pedido(_cotizacion_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q public.cotizaciones%ROWTYPE;
  cli public.clientes%ROWTYPE;
  proy public.proyectos_joya%ROWTYPE;
  detalles jsonb;
  v_pedido_id uuid;
  v_referencia text;
  v_descripcion text;
BEGIN
  IF NOT public.es_admin(auth.uid()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT * INTO q
  FROM public.cotizaciones
  WHERE id = _cotizacion_id;

  IF q.id IS NULL THEN
    RAISE EXCEPTION 'Cotización no encontrada';
  END IF;

  IF q.estado <> 'aprobada' THEN
    RAISE EXCEPTION 'La cotización debe estar aprobada';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.pedidos
    WHERE cotizacion_id = q.id
  ) THEN
    RAISE EXCEPTION 'Esta cotización ya fue convertida';
  END IF;

  SELECT * INTO cli
  FROM public.clientes
  WHERE id = q.cliente_id;

  SELECT * INTO proy
  FROM public.proyectos_joya
  WHERE id = q.proyecto_joya_id;

  SELECT COALESCE(
    jsonb_agg(to_jsonb(d) ORDER BY d.orden),
    '[]'::jsonb
  )
  INTO detalles
  FROM public.cotizacion_detalles d
  WHERE d.cotizacion_id = q.id;

  SELECT string_agg(d.descripcion, ' · ' ORDER BY d.orden)
  INTO v_descripcion
  FROM public.cotizacion_detalles d
  WHERE d.cotizacion_id = q.id;

  v_referencia := q.numero || '-V' || q.version || '-01';

  INSERT INTO public.pedidos (
    referencia,
    pieza,
    cliente,
    material,
    estado,
    entrega,
    importe,
    sede_id,
    telefono,
    origen,
    contrato,
    contrato_id,
    cotizacion_id,
    proyecto_joya_id,
    cotizacion_detalles,
    especificaciones_comerciales,
    trabajo,
    fecha_ingreso,
    fecha_entrega,
    area_actual,
    ruta,
    area_desde,
    notas,
    talla,
    cantidad_piezas,
    piedras,
    peso_estimado,
    ventas_estado,
    packing_estado,
    medio_envio,
    guia_envio,
    receptor_envio,
    notas_ventas,
    corte_texto,
    corte_tipografia,
    corte_ubicacion,
    corte_observaciones
  )
  VALUES (
    v_referencia,
    COALESCE(proy.nombre, v_descripcion, 'Trabajo de joyería'),
    COALESCE(cli.nombre, 'Cliente'),
    COALESCE(
      nullif(trim(concat_ws(' ', proy.metal, proy.ley)), ''),
      'Por definir'
    ),
    'Recibido',
    COALESCE(q.fecha_entrega_solicitada::text, ''),
    q.total,
    q.sede_id,
    COALESCE(cli.telefono, ''),
    'Cotización ' || q.numero,
    '',
    NULL,
    q.id,
    q.proyecto_joya_id,
    detalles,
    jsonb_build_object(
      'moneda', q.moneda,
      'descuento', q.descuento,
      'impuestos', q.impuestos,
      'anticipo', q.anticipo
    ),
    COALESCE(v_descripcion, 'Trabajo de joyería'),
    current_date,
    q.fecha_entrega_solicitada,
    'Pedidos',
    ARRAY['Pedidos'],
    now(),
    q.notas_cliente,
    COALESCE(proy.talla, ''),
    1,
    COALESCE(proy.piedras, ''),
    COALESCE(proy.peso_estimado::text, ''),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_pedido_id;

  RETURN jsonb_build_object(
    'pedido_id', v_pedido_id,
    'contrato_id', NULL,
    'contrato_numero', NULL
  );
END
$$;

REVOKE EXECUTE ON FUNCTION public.convertir_cotizacion_a_pedido(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.convertir_cotizacion_a_pedido(uuid) TO authenticated;
