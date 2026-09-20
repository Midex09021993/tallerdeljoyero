-- Genera automáticamente el identificador visible de cada joya registrada desde la app.
-- Formato: JY-<SEDE>-<FECHA>-<SUFIJO_UNICO>
-- Ejemplo: JY-PRU-260920-A1B2C3D4
-- Las importaciones Excel que ya traen código conservan su identificador.

create or replace function public.generar_codigo_joya()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_sede text;
  v_prefijo text;
begin
  if coalesce(trim(new.codigo), '') <> '' and coalesce(new.origen, 'app') <> 'app' then
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

  new.codigo := format(
    'JY-%s-%s-%s',
    v_prefijo,
    to_char(current_date, 'YYMMDD'),
    upper(substr(replace(new.id::text, '-', ''), 1, 8))
  );

  return new;
end;
$$;

drop trigger if exists inventario_joya_codigo_auto on public.inventario_joyas;

create trigger inventario_joya_codigo_auto
before insert on public.inventario_joyas
for each row
execute function public.generar_codigo_joya();

revoke all on function public.generar_codigo_joya() from public, anon, authenticated;
