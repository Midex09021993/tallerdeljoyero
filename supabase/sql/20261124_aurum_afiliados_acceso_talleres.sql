-- ============================================================
-- AURUM LAB · AFILIADOS
-- Acceso de talleres registrados al panel de afiliado.
--
-- IMPORTANTE:
-- Ejecutar manualmente en Supabase SQL Editor.
-- Esta migración NO se ejecuta desde la aplicación.
--
-- Regla:
--   - Alumno: propietario por aurum_afiliados.user_id.
--   - Taller: solo la cuenta principal activa del participante
--     propietario (participante_cuentas.relacion = 'principal').
--   - Administración: dueno / gerente conserva acceso global.
-- ============================================================

begin;

create or replace function public.aurum_afiliado_es_propietario(
  _afiliado_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.aurum_afiliados a
    where a.id = _afiliado_id
      and (
        a.user_id = (select auth.uid())
        or (
          a.tipo = 'taller'
          and a.participante_id is not null
          and exists (
            select 1
            from public.participante_cuentas pc
            where pc.participante_id = a.participante_id
              and pc.user_id = (select auth.uid())
              and pc.estado = 'activo'
              and pc.relacion = 'principal'
          )
        )
      )
  );
$function$;

-- Perfil del afiliado: alumno propietario o cuenta principal del taller.
alter policy aurum_afiliado_ver_propio
on public.aurum_afiliados
using (
  public.aurum_afiliado_es_propietario(id)
  or public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or public.has_role((select auth.uid()), 'gerente'::public.app_role)
);

-- Visitas/referidos: el titular del taller también puede consultar sus datos.
alter policy aurum_referidos_ver_propio
on public.aurum_afiliado_referidos
using (
  public.aurum_afiliado_es_propietario(afiliado_id)
  or public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or public.has_role((select auth.uid()), 'gerente'::public.app_role)
);

-- Atribuciones: el referido consulta su propia atribución y el afiliado
-- propietario (alumno o cuenta principal del taller) consulta la suya.
alter policy aurum_atribuciones_ver_propio
on public.aurum_afiliado_atribuciones
using (
  referido_user_id = (select auth.uid())
  or public.aurum_afiliado_es_propietario(afiliado_id)
  or public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or public.has_role((select auth.uid()), 'gerente'::public.app_role)
);

-- Pagos: el alumno ve su operación; el afiliado propietario ve los pagos
-- atribuidos a su código; administración conserva visibilidad global.
alter policy aurum_pago_ver_propio
on public.aurum_formacion_pagos
using (
  alumno_user_id = (select auth.uid())
  or (
    afiliado_id is not null
    and public.aurum_afiliado_es_propietario(afiliado_id)
  )
  or public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or public.has_role((select auth.uid()), 'gerente'::public.app_role)
);

commit;

-- Verificación de la función y políticas actualizadas.
select
  p.proname as funcion,
  p.prosecdef as security_definer,
  pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'aurum_afiliado_es_propietario';

select
  tablename,
  policyname,
  cmd,
  qual
from pg_policies
where schemaname = 'public'
  and policyname in (
    'aurum_afiliado_ver_propio',
    'aurum_referidos_ver_propio',
    'aurum_atribuciones_ver_propio',
    'aurum_pago_ver_propio'
  )
order by tablename;
