-- Refuerza la vigencia comercial de las cotizaciones respondidas desde el portal.
-- Una cotización enviada no puede aprobarse, rechazarse ni pedir cambios
-- después de su fecha de vencimiento.

create or replace function public.responder_cotizacion_cliente(
  _codigo text,
  _accion text,
  _comentario text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cotizacion_id uuid;
  v_estado text;
  v_fecha_vencimiento date;
  v_accion text := lower(trim(coalesce(_accion, '')));
  v_comentario text := btrim(coalesce(_comentario, ''));
  v_nuevo_estado text;
begin
  if v_accion not in ('aprobada', 'requiere_revision', 'rechazada') then
    raise exception 'Acción de cotización no válida';
  end if;

  if v_accion in ('requiere_revision', 'rechazada') and length(v_comentario) < 3 then
    raise exception 'Debes indicar un comentario o motivo';
  end if;

  select c.id, c.estado, c.fecha_vencimiento
    into v_cotizacion_id, v_estado, v_fecha_vencimiento
  from public.cotizaciones c
  where (
    c.seguimiento_codigo = upper(trim(_codigo))
    or c.seguimiento_token::text = lower(trim(_codigo))
  )
  limit 1
  for update;

  if v_cotizacion_id is null then
    raise exception 'Cotización no encontrada';
  end if;

  if v_estado <> 'enviada' then
    raise exception 'Esta cotización ya no está disponible para responder';
  end if;

  if v_fecha_vencimiento is not null and current_date > v_fecha_vencimiento then
    update public.cotizaciones
       set estado = 'vencida',
           updated_at = now()
     where id = v_cotizacion_id;

    raise exception 'La cotización está vencida y ya no admite respuestas';
  end if;

  v_nuevo_estado := v_accion;

  insert into public.cotizacion_respuestas_cliente (
    cotizacion_id,
    accion,
    comentario
  )
  values (
    v_cotizacion_id,
    v_accion,
    v_comentario
  );

  update public.cotizaciones
     set estado = v_nuevo_estado,
         updated_at = now()
   where id = v_cotizacion_id;

  return jsonb_build_object(
    'cotizacion_id', v_cotizacion_id,
    'estado', v_nuevo_estado
  );
end;
$$;

revoke all on function public.responder_cotizacion_cliente(text, text, text) from public, authenticated;
grant execute on function public.responder_cotizacion_cliente(text, text, text) to anon;
