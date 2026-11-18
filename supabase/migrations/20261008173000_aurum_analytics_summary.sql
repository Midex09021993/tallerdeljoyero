-- Panel privado de analítica de Aurum Lab.
-- Los eventos públicos solo se pueden insertar; los agregados se exponen
-- mediante una función que exige rol Dueño.

create or replace function public.obtener_analitica_aurum_lab(
  _dias integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dias integer := greatest(1, least(coalesce(_dias, 30), 365));
  v_desde timestamptz := now() - make_interval(days => v_dias);
  v_total bigint;
  v_sesiones bigint;
  v_eventos jsonb;
  v_diario jsonb;
begin
  if not public.has_role(auth.uid(), 'dueno'::app_role) then
    raise exception 'No tienes permisos para consultar la analítica';
  end if;

  select count(*), count(distinct session_id)
    into v_total, v_sesiones
  from public.aurum_analytics_events
  where created_at >= v_desde;

  select coalesce(jsonb_object_agg(event_name, cantidad), '{}'::jsonb)
    into v_eventos
  from (
    select event_name, count(*) as cantidad
    from public.aurum_analytics_events
    where created_at >= v_desde
    group by event_name
    order by event_name
  ) q;

  select coalesce(jsonb_agg(row_to_json(q) order by q.fecha), '[]'::jsonb)
    into v_diario
  from (
    select
      to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as fecha,
      count(*) as eventos,
      count(distinct session_id) as sesiones
    from public.aurum_analytics_events
    where created_at >= v_desde
    group by date_trunc('day', created_at)
  ) q;

  return jsonb_build_object(
    'dias', v_dias,
    'desde', v_desde,
    'total_eventos', v_total,
    'sesiones', v_sesiones,
    'eventos', v_eventos,
    'diario', v_diario
  );
end;
$$;

revoke all on function public.obtener_analitica_aurum_lab(integer) from public, anon;
grant execute on function public.obtener_analitica_aurum_lab(integer) to authenticated;

comment on function public.obtener_analitica_aurum_lab(integer) is
'Resumen privado de analítica pública de Aurum Lab. Solo Dueño.';
