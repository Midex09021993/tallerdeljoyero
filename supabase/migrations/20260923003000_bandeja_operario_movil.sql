-- Bandeja operativa del operario: lectura explícita y segura de trabajos propios
-- y trabajos libres dentro de sus áreas. Evita depender de la forma de la consulta
-- del cliente y mantiene la autorización en PostgreSQL.

create or replace function public.listar_trabajos_operario()
returns table (
  id uuid,
  pedido_id uuid,
  area text,
  ubicacion text,
  titulo text,
  descripcion text,
  estado text,
  prioridad text,
  tipo text,
  fecha_planificada date,
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  notas text,
  responsable_user_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not public.has_role(v_uid, 'operario') then
    raise exception 'Solo un operario puede consultar su bandeja';
  end if;

  return query
  select
    t.id,
    t.pedido_id,
    t.area,
    t.ubicacion,
    t.titulo,
    t.descripcion,
    t.estado,
    t.prioridad,
    t.tipo,
    t.fecha_planificada,
    t.fecha_inicio,
    t.fecha_fin,
    t.notas,
    t.responsable_user_id
  from public.trabajos t
  where t.estado in ('pendiente', 'en_proceso', 'bloqueado')
    and public.ve_sede(v_uid, t.sede_id)
    and (
      t.responsable_user_id = v_uid
      or (
        t.responsable_user_id is null
        and exists (
          select 1
          from public.user_areas ua
          where ua.user_id = v_uid
            and lower(trim(ua.area)) = lower(trim(t.area))
        )
      )
    )
  order by t.fecha_planificada nulls first, t.created_at;
end;
$$;

revoke all on function public.listar_trabajos_operario() from public, anon;
grant execute on function public.listar_trabajos_operario() to authenticated;

comment on function public.listar_trabajos_operario() is
  'Bandeja segura del operario: trabajos propios y operaciones libres de sus áreas en su misma sede.';
