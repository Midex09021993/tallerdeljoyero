-- Simplifica el identificador visible de joyas.
-- Formato: J-<SEDE>-<CONSECUTIVO>
-- Ejemplo: J-PRU-001
-- El consecutivo es independiente por sede y la unicidad se garantiza por (sede_id, codigo).

create or replace function public.generar_codigo_joya()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_sede text;
  v_prefijo text;
  v_siguiente integer;
begin
  if coalesce(trim(new.codigo), '') <> '' then
    return new;
  end if;

  select s.nombre into v_sede
  from public.sedes s
  where s.id = new.sede_id;

  if v_sede is null then
    raise exception 'No se encontró la sede para generar el código de la joya';
  end if;

  v_prefijo := upper(regexp_replace(left(trim(v_sede), 3), '[^A-Za-z0-9]', '', 'g'));
  v_prefijo := coalesce(nullif(v_prefijo, ''), 'SED');

  perform pg_advisory_xact_lock(hashtextextended(new.sede_id::text, 0));

  select coalesce(max((regexp_match(codigo, '-([0-9]+)$'))[1]::integer), 0) + 1
    into v_siguiente
  from public.inventario_joyas
  where sede_id = new.sede_id
    and codigo like 'J-' || v_prefijo || '-%'
    and codigo ~ ('^J-' || v_prefijo || '-[0-9]+$');

  new.codigo := format('J-%s-%s', v_prefijo, lpad(v_siguiente::text, 3, '0'));
  return new;
end;
$$;

drop trigger if exists inventario_joya_codigo_auto on public.inventario_joyas;

create trigger inventario_joya_codigo_auto
before insert on public.inventario_joyas
for each row
execute function public.generar_codigo_joya();

revoke all on function public.generar_codigo_joya() from public, anon, authenticated;

update public.inventario_joyas j
set codigo = 'J-' || p.prefijo || '-' || lpad(p.n::text, 3, '0')
from (
  select j2.id as joya_id,
         j2.sede_id,
         coalesce(nullif(upper(regexp_replace(left(trim(s.nombre), 3), '[^A-Za-z0-9]', '', 'g')), ''), 'SED') as prefijo,
         row_number() over (
           partition by j2.sede_id
           order by j2.created_at, j2.id
         ) as n
  from public.inventario_joyas j2
  join public.sedes s on s.id = j2.sede_id
) p
where j.id = p.joya_id
  and coalesce(trim(j.codigo), '') = '';

create unique index if not exists inventario_joyas_sede_codigo_uidx
  on public.inventario_joyas (sede_id, codigo)
  where coalesce(trim(codigo), '') <> '';
