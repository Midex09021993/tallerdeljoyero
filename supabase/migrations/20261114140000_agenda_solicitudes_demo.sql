-- Integración segura de solicitudes públicas de demostración con la Agenda de FADILAB.
-- Ejecutar manualmente en Supabase/Lovable Cloud después de desplegar el frontend.

begin;

create index if not exists solicitudes_demo_estado_created_idx
  on public.solicitudes_demo (estado, created_at desc);

create or replace function public.agenda_listar_solicitudes_demo()
returns table (
  id uuid,
  empresa text,
  nombre text,
  telefono text,
  email text,
  interes text,
  horario_preferido text,
  estado text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.agenda_es_administrador() then
    raise exception using errcode = '42501', message = 'Sólo el administrador de FADILAB puede consultar las solicitudes de demostración.';
  end if;

  return query
  select d.id, d.empresa, d.nombre, d.telefono, d.email,
         d.interes, d.horario_preferido, d.estado, d.created_at
  from public.solicitudes_demo d
  where d.estado <> 'cerrado'
  order by
    case d.estado when 'pendiente' then 0 when 'contactado' then 1 when 'demo_agendada' then 2 else 3 end,
    d.created_at desc
  limit 200;
end;
$$;

revoke all on function public.agenda_listar_solicitudes_demo() from public, anon;
grant execute on function public.agenda_listar_solicitudes_demo() to authenticated;

create or replace function public.agenda_actualizar_solicitud_demo(
  _solicitud_id uuid,
  _estado text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.agenda_es_administrador() then
    raise exception using errcode = '42501', message = 'Sólo el administrador de FADILAB puede actualizar solicitudes.';
  end if;

  if _estado not in ('pendiente', 'contactado', 'demo_agendada', 'cerrado') then
    raise exception using errcode = '22023', message = 'Estado de solicitud no válido.';
  end if;

  update public.solicitudes_demo
  set estado = _estado
  where id = _solicitud_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'No se encontró la solicitud de demostración.';
  end if;
end;
$$;

revoke all on function public.agenda_actualizar_solicitud_demo(uuid,text) from public, anon;
grant execute on function public.agenda_actualizar_solicitud_demo(uuid,text) to authenticated;

notify pgrst, 'reload schema';
commit;
