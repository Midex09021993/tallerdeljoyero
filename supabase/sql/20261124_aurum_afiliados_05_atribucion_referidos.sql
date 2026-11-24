-- ============================================================
-- AURUM LAB · PARTNERS
-- Registro seguro de visitas y vinculación de referidos autenticados.
-- Migración incremental: NO crea ni modifica las ocho tablas existentes.
-- Ejecutar manualmente desde Lovable Cloud / Supabase SQL Editor.
-- ============================================================

begin;

-- Primera visita: un visitante conserva su primera atribución.
-- El navegador envía únicamente un hash SHA-256 aleatorio, nunca datos personales.
create or replace function public.aurum_registrar_visita_afiliado(
  _codigo text,
  _visitante_hash text
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_afiliado_id uuid;
  v_referido_id uuid;
  v_ventana_dias integer;
begin
  if coalesce(_codigo, '') !~ '^[A-Za-z0-9_-]{3,64}$'
     or coalesce(_visitante_hash, '') !~ '^[a-fA-F0-9]{64}$' then
    return null;
  end if;

  select a.id
    into v_afiliado_id
  from public.aurum_afiliados a
  where a.codigo = upper(trim(_codigo))
    and a.estado = 'activo';

  if not found then
    return null;
  end if;

  -- Idempotencia y first-touch: nunca reemplazar la primera recomendación.
  select r.id
    into v_referido_id
  from public.aurum_afiliado_referidos r
  where r.visitante_hash = lower(_visitante_hash);

  if found then
    return v_referido_id;
  end if;

  select c.ventana_atribucion_dias
    into v_ventana_dias
  from public.aurum_afiliados_config c
  where c.id = true;

  if not found then
    raise exception 'No existe configuración del programa de afiliados.';
  end if;

  insert into public.aurum_afiliado_referidos (
    afiliado_id,
    visitante_hash,
    primera_visita_en,
    vence_en
  )
  values (
    v_afiliado_id,
    lower(_visitante_hash),
    now(),
    now() + pg_catalog.make_interval(days => v_ventana_dias)
  )
  on conflict (visitante_hash) do nothing
  returning id into v_referido_id;

  if v_referido_id is null then
    select r.id
      into v_referido_id
    from public.aurum_afiliado_referidos r
    where r.visitante_hash = lower(_visitante_hash);
  end if;

  return v_referido_id;
end;
$function$;

-- Vincula una visita vigente al usuario autenticado.
-- La atribución es única por referido y por usuario: first-touch wins.
create or replace function public.aurum_vincular_referido_afiliado(
  _visitante_hash text
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_referido public.aurum_afiliado_referidos%rowtype;
  v_afiliado public.aurum_afiliados%rowtype;
  v_atribucion_id uuid;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para vincular la recomendación.';
  end if;

  if coalesce(_visitante_hash, '') !~ '^[a-fA-F0-9]{64}$' then
    return null;
  end if;

  -- Si el usuario ya fue atribuido, no se permite cambiar de afiliado.
  select a.id
    into v_atribucion_id
  from public.aurum_afiliado_atribuciones a
  where a.referido_user_id = v_user_id;

  if found then
    return v_atribucion_id;
  end if;

  select r.*
    into v_referido
  from public.aurum_afiliado_referidos r
  where r.visitante_hash = lower(_visitante_hash)
    and r.vence_en > now()
  for update;

  if not found then
    return null;
  end if;

  select a.*
    into v_afiliado
  from public.aurum_afiliados a
  where a.id = v_referido.afiliado_id
    and a.estado = 'activo';

  if not found then
    return null;
  end if;

  -- Impedir autorreferidos de alumnos y de la cuenta principal del taller.
  if v_afiliado.user_id = v_user_id
     or (
       v_afiliado.tipo = 'taller'
       and v_afiliado.participante_id is not null
       and exists (
         select 1
         from public.participante_cuentas pc
         where pc.participante_id = v_afiliado.participante_id
           and pc.user_id = v_user_id
           and pc.estado = 'activo'
           and pc.relacion = 'principal'
       )
     ) then
    return null;
  end if;

  insert into public.aurum_afiliado_atribuciones (
    afiliado_id,
    referido_id,
    referido_user_id
  )
  values (
    v_referido.afiliado_id,
    v_referido.id,
    v_user_id
  )
  on conflict do nothing
  returning id into v_atribucion_id;

  if v_atribucion_id is not null then
    return v_atribucion_id;
  end if;

  -- Otra sesión pudo vincular al usuario o al referido en paralelo.
  select a.id
    into v_atribucion_id
  from public.aurum_afiliado_atribuciones a
  where a.referido_user_id = v_user_id
     or a.referido_id = v_referido.id
  order by a.atribuido_en
  limit 1;

  return v_atribucion_id;
end;
$function$;

revoke all on function public.aurum_registrar_visita_afiliado(text, text) from public;
grant execute on function public.aurum_registrar_visita_afiliado(text, text) to anon, authenticated, service_role;

revoke all on function public.aurum_vincular_referido_afiliado(text) from public, anon;
grant execute on function public.aurum_vincular_referido_afiliado(text) to authenticated, service_role;

-- Cada pago de matrícula hereda la atribución ya vinculada a la cuenta.
-- El navegador no puede elegir afiliado_id ni referido_id.
create or replace function public.aurum_asignar_atribucion_pago_afiliado()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_afiliado_id uuid;
  v_referido_id uuid;
begin
  if new.alumno_user_id is null then
    return new;
  end if;

  select a.afiliado_id, a.referido_id
    into v_afiliado_id, v_referido_id
  from public.aurum_afiliado_atribuciones a
  where a.referido_user_id = new.alumno_user_id;

  if not found then
    return new;
  end if;

  if new.afiliado_id is not null and new.afiliado_id <> v_afiliado_id then
    raise exception 'La afiliación del pago no coincide con la atribución registrada.';
  end if;

  if new.referido_id is not null and new.referido_id <> v_referido_id then
    raise exception 'El referido del pago no coincide con la atribución registrada.';
  end if;

  new.afiliado_id := v_afiliado_id;
  new.referido_id := v_referido_id;
  return new;
end;
$function$;

revoke all on function public.aurum_asignar_atribucion_pago_afiliado() from public, anon, authenticated;

drop trigger if exists trg_aurum_asignar_atribucion_pago_afiliado
  on public.aurum_formacion_pagos;

create trigger trg_aurum_asignar_atribucion_pago_afiliado
before insert or update of alumno_user_id
on public.aurum_formacion_pagos
for each row
execute function public.aurum_asignar_atribucion_pago_afiliado();

notify pgrst, 'reload schema';

commit;

-- Verificación de las firmas instaladas.
select
  p.proname,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as argumentos,
  p.prosecdef as security_definer
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'aurum_registrar_visita_afiliado',
    'aurum_vincular_referido_afiliado'
  )
order by p.proname;
