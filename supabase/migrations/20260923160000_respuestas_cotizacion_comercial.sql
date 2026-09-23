-- Permite al área comercial consultar de forma segura las respuestas
-- registradas por el cliente en el portal público.
create or replace function public.listar_respuestas_cotizacion(_cotizacion_id uuid)
returns table (
  id uuid,
  accion text,
  comentario text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_sede_id uuid;
begin
  if v_uid is null then
    raise exception 'Sesión no válida';
  end if;

  select c.sede_id
    into v_sede_id
  from public.cotizaciones c
  where c.id = _cotizacion_id;

  if v_sede_id is null then
    raise exception 'Cotización no encontrada';
  end if;

  if not public.es_admin(v_uid)
     and not private.usuario_puede_ventas(v_uid, v_sede_id) then
    raise exception 'No tienes permisos para consultar la respuesta de esta cotización';
  end if;

  return query
  select
    r.id,
    r.accion,
    r.comentario,
    r.created_at
  from public.cotizacion_respuestas_cliente r
  where r.cotizacion_id = _cotizacion_id
  order by r.created_at desc;
end;
$$;

revoke all on function public.listar_respuestas_cotizacion(uuid) from public, anon;
grant execute on function public.listar_respuestas_cotizacion(uuid) to authenticated;
