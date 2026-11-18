-- Solo el rol dueno puede cambiar el plan comercial asignado a una organización.
-- Aplicar manualmente en Supabase SQL Editor después de las migraciones de cuotas.
begin;

create or replace function public.aurum_proteger_plan_comercial_participante()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.metadata -> 'plan_comercial') is distinct from (old.metadata -> 'plan_comercial')
     and auth.uid() is not null
     and not public.has_role(auth.uid(), 'dueno'::public.app_role) then
    raise exception 'SOLO_DUENO_PUEDE_CAMBIAR_PLAN: solo el Dueño de la plataforma puede asignar planes comerciales';
  end if;

  return new;
end;
$$;

drop trigger if exists aurum_proteger_plan_comercial_participante_trg
  on public.ecosistema_participantes;

create trigger aurum_proteger_plan_comercial_participante_trg
before update of metadata on public.ecosistema_participantes
for each row
execute function public.aurum_proteger_plan_comercial_participante();

revoke all on function public.aurum_proteger_plan_comercial_participante() from public, anon, authenticated;

commit;
