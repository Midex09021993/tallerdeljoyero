-- Conserva las solicitudes cerradas en el historial de FADILAB.
-- La interfaz aplica filtros y paginación de 10 registros por página.
-- Ejecutar manualmente en Supabase/Lovable Cloud.

begin;

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
  created_at timestamptz,
  fecha_reunion_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.agenda_es_administrador() then
    raise exception using
      errcode = '42501',
      message = 'Sólo el administrador de FADILAB puede consultar las solicitudes de demostración.';
  end if;

  return query
  select
    d.id,
    d.empresa,
    d.nombre,
    d.telefono,
    d.email,
    d.interes,
    d.horario_preferido,
    d.estado,
    d.created_at,
    coalesce(d.fecha_reunion_at, h.inicio_at)
  from public.solicitudes_demo d
  left join public.agenda_horarios h
    on h.solicitud_demo_id = d.id
  -- No excluir cerradas: permanecen consultables en el historial.
  order by
    case d.estado
      when 'pendiente' then 0
      when 'contactado' then 1
      when 'demo_agendada' then 2
      when 'cerrado' then 3
      else 4
    end,
    d.created_at desc
  limit 1000;
end;
$$;

revoke all on function public.agenda_listar_solicitudes_demo()
from public, anon;

grant execute on function public.agenda_listar_solicitudes_demo()
to authenticated;

notify pgrst, 'reload schema';

commit;
