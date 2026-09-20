create or replace function public.guard_cotizacion_update()
returns trigger language plpgsql set search_path = public
as $function$
begin
  if old.estado <> 'borrador' then
    if new.estado = old.estado then
      if (to_jsonb(new) - 'updated_at') <> (to_jsonb(old) - 'updated_at') then
        raise exception 'La cotización no puede editarse fuera de borrador; cree una nueva versión';
      end if;
    elsif not (
      (old.estado = 'enviada' and new.estado in ('aprobada','rechazada','vencida','cancelada'))
      or (old.estado = 'aprobada' and new.estado = 'cancelada')
    ) then
      raise exception 'Transición no permitida: % -> %', old.estado, new.estado;
    end if;
  elsif new.estado not in ('borrador','enviada','aprobada','cancelada') then
    raise exception 'Transición no permitida: borrador -> %', new.estado;
  end if;
  new.updated_at := now();
  return new;
end;
$function$;
