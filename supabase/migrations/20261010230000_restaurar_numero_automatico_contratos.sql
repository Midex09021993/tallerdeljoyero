-- Corrige el cambio de contrato externo: todos los contratos creados en
-- el módulo Contratos Aurum reciben numeración automática. Los códigos externos
-- se registran en el flujo de Pedidos, no en este formulario.
drop function if exists public.crear_contrato_comercial(text, text, text, numeric, uuid, text, uuid, text);

create function public.crear_contrato_comercial(
  _cliente text,
  _telefono text,
  _origen text,
  _total numeric,
  _sede_id uuid,
  _notas text,
  _cotizacion_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cot public.cotizaciones%rowtype;
  v_cliente text := nullif(btrim(coalesce(_cliente, '')), '');
  v_telefono text := coalesce(btrim(_telefono), '');
  v_origen text := coalesce(nullif(btrim(_origen, '')), 'Contrato Aurum');
  v_notas text := coalesce(_notas, '');
  v_total numeric := greatest(0, coalesce(_total, 0));
  v_numero text;
  v_id uuid;
begin
  if not public.es_admin(auth.uid()) then
    raise exception 'No autorizado para crear contratos';
  end if;
  if _sede_id is null then
    raise exception 'Selecciona un taller para crear el contrato';
  end if;
  if v_cliente is null then
    raise exception 'El cliente es obligatorio';
  end if;

  if _cotizacion_id is not null then
    select * into v_cot
    from public.cotizaciones
    where id = _cotizacion_id
    for update;

    if not found then
      raise exception 'Cotización no encontrada';
    end if;
    if v_cot.estado <> 'aprobada' then
      raise exception 'Solo se puede crear un contrato desde una cotización aprobada';
    end if;
    if v_cot.sede_id is distinct from _sede_id then
      raise exception 'La cotización debe pertenecer al mismo taller del contrato';
    end if;

    select c.id, c.numero into v_id, v_numero
    from public.contratos c
    where c.cotizacion_id = _cotizacion_id
    limit 1;
    if found then
      return jsonb_build_object('id', v_id, 'numero', v_numero, 'creado', false);
    end if;

    select cl.nombre, coalesce(cl.telefono, '')
    into v_cliente, v_telefono
    from public.clientes cl
    where cl.id = v_cot.cliente_id;
    if v_cliente is null then
      raise exception 'No se encontró el cliente de la cotización';
    end if;

    v_origen := 'Cotización ' || v_cot.numero || ' v' || v_cot.version;
    v_notas := coalesce(v_cot.notas_internas, '');
    v_total := greatest(0, coalesce(v_cot.total, 0));
  end if;

  v_numero := public.siguiente_numero_contrato(_sede_id, extract(year from current_date)::integer);

  insert into public.contratos (
    numero, cliente, telefono, origen, total, abonado, sede_id, notas, cotizacion_id
  )
  values (
    v_numero, v_cliente, v_telefono, v_origen, v_total,
    0, _sede_id, v_notas, _cotizacion_id
  )
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'numero', v_numero, 'creado', true);
end;
$$;

revoke all on function public.crear_contrato_comercial(text, text, text, numeric, uuid, text, uuid) from public, anon;
grant execute on function public.crear_contrato_comercial(text, text, text, numeric, uuid, text, uuid) to authenticated;

notify pgrst, 'reload schema';
