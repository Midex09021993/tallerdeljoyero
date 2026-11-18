-- Calidad final usa el motor único de transiciones de producción.
-- Evita que un trigger cambie directamente el estado de la OP.
create or replace function public.validar_liberacion_calidad_op()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if not public.ve_sede((select auth.uid()), (select op.sede_id from public.ordenes_produccion op where op.id=new.orden_produccion_id)) then
    raise exception 'No tienes acceso a la orden de producción';
  end if;

  if new.resultado='aprobado' and new.tipo='inspeccion_final' then
    perform public.transicionar_orden_produccion(new.orden_produccion_id,'terminada');
  end if;

  return new;
end;
$$;

revoke execute on function public.validar_liberacion_calidad_op() from public,anon,authenticated;
