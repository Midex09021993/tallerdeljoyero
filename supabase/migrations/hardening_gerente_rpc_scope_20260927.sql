-- Hardening: limitar cambiar_estado_trabajo al taller del actor.
create or replace function public.cambiar_estado_trabajo(_trabajo_id uuid, _nuevo_estado text)
returns void
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  _resp uuid;
  _sede_id uuid;
begin
  if _nuevo_estado not in ('pendiente','en_proceso','bloqueado','completado','cancelado') then
    raise exception 'Estado no válido: %', _nuevo_estado;
  end if;

  select responsable_user_id, sede_id into _resp, _sede_id
  from public.trabajos where id = _trabajo_id;

  if not found then raise exception 'Trabajo no encontrado'; end if;

  if not (
    public.has_role(auth.uid(), 'dueno'::public.app_role)
    or (public.has_role(auth.uid(), 'gerente'::public.app_role) and public.ve_sede(auth.uid(), _sede_id))
    or (_resp = auth.uid() and public.ve_sede(auth.uid(), _sede_id))
  ) then
    raise exception 'No autorizado';
  end if;

  update public.trabajos
  set estado = _nuevo_estado,
      fecha_inicio = case when _nuevo_estado = 'en_proceso' and fecha_inicio is null then now() else fecha_inicio end,
      fecha_fin = case when _nuevo_estado = 'completado' then now() else fecha_fin end,
      updated_at = now()
  where id = _trabajo_id;
end;
$function$;
