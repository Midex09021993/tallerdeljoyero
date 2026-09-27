-- Cierre de seguridad posterior a la consolidacion del ecosistema.
-- No crea datos de negocio ni elimina sedes.
-- Corrige exposicion de funciones SECURITY DEFINER y habilita RLS
-- en el numerador de cotizaciones.

begin;

-- ============================================================
-- NUMERADORES DE COTIZACIONES
-- ============================================================

alter table public.cotizacion_numeradores enable row level security;

drop policy if exists "cotizacion numeradores dueno" on public.cotizacion_numeradores;

create policy "cotizacion numeradores dueno"
on public.cotizacion_numeradores
for all
to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or public.ve_sede((select auth.uid()), cotizacion_numeradores.sede_id)
)
with check (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or public.ve_sede((select auth.uid()), cotizacion_numeradores.sede_id)
);

-- ============================================================
-- FUNCIONES INTERNAS: NUNCA ANON
-- ============================================================

revoke all on function public.mi_sede(uuid) from public;
grant execute on function public.mi_sede(uuid) to authenticated;

revoke all on function public.ve_sede(uuid, uuid) from public;
grant execute on function public.ve_sede(uuid, uuid) to authenticated;

revoke all on function public.recalcular_abonado_contrato(uuid) from public;
grant execute on function public.recalcular_abonado_contrato(uuid) to authenticated;

revoke all on function public.sincronizar_abonado_contrato() from public;
grant execute on function public.sincronizar_abonado_contrato() to authenticated;

revoke all on function public.validar_subcapacidad_trabajo() from public;
grant execute on function public.validar_subcapacidad_trabajo() to authenticated;

-- Estas funciones requieren usuario autenticado y ya validan permisos
-- dentro de su propia logica.
revoke all on function public.asignar_participante_externo_trabajo(uuid, uuid) from public;
grant execute on function public.asignar_participante_externo_trabajo(uuid, uuid) to authenticated;

revoke all on function public.asignar_responsable_trabajo(uuid, uuid) from public;
grant execute on function public.asignar_responsable_trabajo(uuid, uuid) to authenticated;

revoke all on function public.cambiar_estado_trabajo(uuid, text) from public;
grant execute on function public.cambiar_estado_trabajo(uuid, text) to authenticated;

revoke all on function public.tomar_trabajo(uuid) from public;
grant execute on function public.tomar_trabajo(uuid) to authenticated;

-- ============================================================
-- VERIFICACIONES DE CIERRE
-- ============================================================

do $
declare
  rls_enabled boolean;
  anon_execute boolean;
begin
  select c.relrowsecurity
    into rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'cotizacion_numeradores';

  if not coalesce(rls_enabled, false) then
    raise exception 'CIERRE SEGURIDAD: cotizacion_numeradores sigue sin RLS';
  end if;

  select has_function_privilege(
    'anon',
    'public.mi_sede(uuid)',
    'EXECUTE'
  ) into anon_execute;

  if anon_execute then
    raise exception 'CIERRE SEGURIDAD: anon conserva EXECUTE sobre mi_sede(uuid)';
  end if;

  select has_function_privilege(
    'anon',
    'public.ve_sede(uuid,uuid)',
    'EXECUTE'
  ) into anon_execute;

  if anon_execute then
    raise exception 'CIERRE SEGURIDAD: anon conserva EXECUTE sobre ve_sede(uuid,uuid)';
  end if;
end $;

commit;
