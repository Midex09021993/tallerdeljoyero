-- Vincula el flujo comercial Aurum: Cotización aprobada -> Contrato -> Pedido.
-- Mantiene el flujo manual/external intacto.

alter table public.contratos
  add column if not exists cotizacion_id uuid references public.cotizaciones(id) on delete set null;

create index if not exists contratos_cotizacion_id_idx
  on public.contratos(cotizacion_id);

create or replace function public.convertir_cotizacion_a_pedido_contrato(_cotizacion_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_cot public.cotizaciones%rowtype;
  v_cliente public.clientes%rowtype;
  v_contrato_id uuid;
  v_contrato_numero text;
  v_pedido_id uuid;
  v_existente_contrato uuid;
  v_sede_text text;
  v_next bigint;
begin
  if not public.es_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  select * into v_cot
  from public.cotizaciones
  where id = _cotizacion_id
  for update;

  if not found then raise exception 'Cotización no encontrada'; end if;
  if v_cot.estado <> 'aprobada' then raise exception 'Solo se puede convertir una cotización aprobada'; end if;

  select * into v_cliente from public.clientes where id = v_cot.cliente_id;
  if not found then raise exception 'Cliente de la cotización no encontrado'; end if;

  select id into v_existente_contrato
  from public.contratos
  where cotizacion_id = _cotizacion_id
  limit 1;

  if v_existente_contrato is not null then
    select id into v_pedido_id from public.pedidos where cotizacion_id = _cotizacion_id limit 1;
    return jsonb_build_object(
      'pedido_id', v_pedido_id,
      'contrato_id', v_existente_contrato,
      'contrato_numero', (select numero from public.contratos where id = v_existente_contrato)
    );
  end if;

  v_sede_text := coalesce(v_cot.sede_id::text, 'global');
  perform pg_advisory_xact_lock(hashtext('contrato:' || v_sede_text));

  select coalesce(max(
    case
      when numero ~ ('^CTR-' || to_char(current_date,'YYYY') || '-[0-9]+$')
      then substring(numero from 10)::bigint
      else 0
    end
  ), 0) + 1
  into v_next
  from public.contratos
  where sede_id is not distinct from v_cot.sede_id;

  v_contrato_numero := 'CTR-' || to_char(current_date,'YYYY') || '-' || lpad(v_next::text, 5, '0');

  insert into public.contratos (
    numero, cliente, telefono, origen, total, abonado, saldo, sede_id, notas, cotizacion_id
  )
  values (
    v_contrato_numero,
    v_cliente.nombre,
    coalesce(v_cliente.telefono, ''),
    'Cotización ' || v_cot.numero || ' v' || v_cot.version,
    greatest(0, coalesce(v_cot.total, 0)),
    0,
    greatest(0, coalesce(v_cot.total, 0)),
    v_cot.sede_id,
    coalesce(v_cot.notas_internas, ''),
    _cotizacion_id
  )
  returning id into v_contrato_id;

  v_pedido_id := public.convertir_cotizacion_a_pedido(_cotizacion_id);

  update public.pedidos
  set contrato_id = v_contrato_id,
      contrato = v_contrato_numero,
      updated_at = now()
  where id = v_pedido_id;

  return jsonb_build_object(
    'pedido_id', v_pedido_id,
    'contrato_id', v_contrato_id,
    'contrato_numero', v_contrato_numero
  );
end;
$function$;

comment on function public.convertir_cotizacion_a_pedido_contrato(uuid)
is 'Convierte una cotización aprobada en pedido y crea/vincula su documento contractual financiero, sin registrar automáticamente ningún pago.';
