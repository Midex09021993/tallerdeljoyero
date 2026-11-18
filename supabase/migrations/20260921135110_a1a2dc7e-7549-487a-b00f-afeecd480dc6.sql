DROP POLICY IF EXISTS contratos_insert ON public.contratos;
CREATE POLICY contratos_insert ON public.contratos
  FOR INSERT TO authenticated
  WITH CHECK (es_admin(auth.uid()) AND ve_sede(auth.uid(), sede_id));

CREATE OR REPLACE FUNCTION public.trabajos_responsable_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.es_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.responsable_user_id IS DISTINCT FROM OLD.responsable_user_id
     OR NEW.sede_id IS DISTINCT FROM OLD.sede_id
     OR NEW.pedido_id IS DISTINCT FROM OLD.pedido_id
     OR NEW.orden_produccion_id IS DISTINCT FROM OLD.orden_produccion_id
     OR NEW.participante_id IS DISTINCT FROM OLD.participante_id
     OR NEW.area IS DISTINCT FROM OLD.area
     OR NEW.tipo IS DISTINCT FROM OLD.tipo
     OR NEW.secuencia IS DISTINCT FROM OLD.secuencia
     OR NEW.prioridad IS DISTINCT FROM OLD.prioridad THEN
    RAISE EXCEPTION 'Solo un administrador puede reasignar o reclasificar un trabajo';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trabajos_responsable_guard_trg ON public.trabajos;
CREATE TRIGGER trabajos_responsable_guard_trg
  BEFORE UPDATE ON public.trabajos
  FOR EACH ROW EXECUTE FUNCTION public.trabajos_responsable_guard();
