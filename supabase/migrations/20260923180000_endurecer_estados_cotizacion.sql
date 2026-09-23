-- Los estados de una cotización no son editables libremente.
-- El cambio comercial normal de borrador -> enviada ocurre al enviarla al cliente.
-- Aprobada/requiere_revision/rechazada provienen del portal del cliente y
-- vencida se determina por la vigencia; las versiones se crean como borrador.

create or replace function public.cambiar_estado_cotizacion(
  _cotizacion_id uuid,
  _nuevo_estado text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
begin
  if not public.es_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  select estado
    into v_estado
  from public.cotizaciones
  where id = _cotizacion_id
  for update;

  if v_estado is null then
    raise exception 'Cotización no encontrada';
  end if;

  if v_estado <> 'borrador' or _nuevo_estado <> 'enviada' then
    raise exception 'El estado se determina por el flujo. Una cotización solo puede pasar de borrador a enviada mediante el envío al cliente';
  end if;

  update public.cotizaciones
  set estado = 'enviada',
      updated_at = now()
  where id = _cotizacion_id;
end;
$$;

revoke all on function public.cambiar_estado_cotizacion(uuid, text) from public, anon;
grant execute on function public.cambiar_estado_cotizacion(uuid, text) to authenticated;
