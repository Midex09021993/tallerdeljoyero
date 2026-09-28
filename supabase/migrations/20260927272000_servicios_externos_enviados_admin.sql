-- Vista administrativa de servicios externos enviados.
-- El origen conserva el control del trabajo; el receptor ejecuta la operación.
begin;

create or replace function public.listar_servicios_externos_enviados(_sede_id uuid default null)
returns table (
  id uuid,
  pedido_id uuid,
  orden_produccion_id uuid,
  area text,
  titulo text,
  descripcion text,
  estado text,
  prioridad text,
  fecha_planificada date,
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  responsable_user_id uuid,
  responsable_nombre text,
  destino_participante_id uuid,
  destino_participante_nombre text,
  origen_sede_id uuid,
  origen_sede_nombre text,
  referencia_pedido text,
  pieza text,
  cantidad_piezas integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_sede uuid;
begin
  if v_uid is null then
    raise exception 'Sesión no válida';
  end if;

  if not (
    public.has_role(v_uid, 'dueno')
    or public.has_role(v_uid, 'gerente')
  ) then
    raise exception 'Solo administración puede consultar servicios externos enviados';
  end if;

  if public.has_role(v_uid, 'dueno') then
    v_sede := _sede_id;
  else
    select p.sede_id into v_sede
    from public.profiles p
    where p.id = v_uid;

    if v_sede is null then
      raise exception 'El usuario administrador no tiene taller asignado';
    end if;

    if _sede_id is not null and _sede_id <> v_sede then
      raise exception 'No puedes consultar servicios de otro taller';
    end if;
  end if;

  return query
  select
    t.id,
    t.pedido_id,
    t.orden_produccion_id,
    t.area,
    t.titulo,
    t.descripcion,
    t.estado,
    t.prioridad,
    t.fecha_planificada,
    t.fecha_inicio,
    t.fecha_fin,
    t.responsable_user_id,
    nullif(trim(coalesce(rp.nombre, '') || ' ' || coalesce(rp.apellidos, '')), ''),
    t.participante_id,
    ep_destino.nombre,
    t.sede_id,
    s.nombre,
    p.referencia,
    p.pieza,
    p.cantidad_piezas
  from public.trabajos t
  join public.pedidos p on p.id = t.pedido_id
  left join public.profiles rp on rp.id = t.responsable_user_id
  left join public.ecosistema_participantes ep_destino
    on ep_destino.id = t.participante_id
  left join public.sedes s
    on s.id = t.sede_id
  where t.tipo = 'externo'
    and (v_sede is null or t.sede_id = v_sede)
  order by
    case t.estado
      when 'bloqueado' then 0
      when 'en_proceso' then 1
      when 'pendiente' then 2
      when 'completado' then 3
      else 4
    end,
    t.fecha_planificada nulls last,
    t.created_at desc;
end;
$$;

revoke all on function public.listar_servicios_externos_enviados(uuid) from public, anon;
grant execute on function public.listar_servicios_externos_enviados(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
