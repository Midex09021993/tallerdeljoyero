
ALTER TABLE public.proyectos_joya ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'activo';
ALTER TABLE public.proyectos_joya ADD COLUMN IF NOT EXISTS cantidad_piezas integer NOT NULL DEFAULT 1;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS cotizacion_id uuid REFERENCES public.cotizaciones(id);
ALTER TABLE public.inventario_movimientos ADD COLUMN IF NOT EXISTS pedido_id uuid REFERENCES public.pedidos(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.mover_pedido_a_area(_pedido_id uuid, _destino text, _motivo text DEFAULT NULL)
RETURNS TABLE(destino text, estado text, area_desde timestamptz, reinicia_flujo boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido public.pedidos;
  v_estado text;
  v_ahora timestamptz := now();
  v_reinicia boolean := false;
BEGIN
  SELECT * INTO v_pedido FROM public.pedidos WHERE id = _pedido_id;
  IF v_pedido.id IS NULL THEN
    RAISE EXCEPTION 'Pedido no encontrado';
  END IF;
  IF NOT public.ve_sede(auth.uid(), v_pedido.sede_id) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF _destino = 'Pedidos' THEN
    v_estado := 'Recibido';
    v_reinicia := true;
  ELSIF _destino = 'Área ventas' THEN
    v_estado := 'Listo para Entrega';
  ELSE
    v_estado := 'En Producción';
  END IF;

  UPDATE public.pedidos
     SET area_actual = _destino,
         estado = v_estado,
         area_desde = v_ahora,
         updated_at = v_ahora
   WHERE id = _pedido_id;

  INSERT INTO public.pedido_movimientos (pedido_id, area_origen, area_destino, accion, nota, usuario_id)
  VALUES (_pedido_id, v_pedido.area_actual, _destino, 'mover', coalesce(_motivo, ''), auth.uid());

  RETURN QUERY SELECT _destino, v_estado, v_ahora, v_reinicia;
END;
$$;

REVOKE ALL ON FUNCTION public.mover_pedido_a_area(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mover_pedido_a_area(uuid, text, text) TO authenticated;
