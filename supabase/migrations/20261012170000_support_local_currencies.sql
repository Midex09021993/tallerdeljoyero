-- Support the workshop-local currencies used by Aurum Lab's initial international rollout.
-- This migration changes only the currency validation; it does not convert historical amounts.
alter table public.cotizaciones
  drop constraint if exists cotizaciones_moneda_check;

alter table public.cotizaciones
  add constraint cotizaciones_moneda_check
  check (moneda in ('PEN', 'USD', 'MXN', 'COP', 'DOP'));

-- Keep the existing authorization and transaction logic of the active RPC intact,
-- changing only the currency allowlist.
do $$
declare
  v_signature regprocedure :=
    'public.crear_cotizacion_comercial(uuid,text,text,text,uuid,uuid,text,numeric,numeric,numeric,numeric,numeric,date,date,text,text,text)'::regprocedure;
  v_definition text;
  v_updated text;
begin
  v_definition := pg_get_functiondef(v_signature);
  v_updated := replace(
    v_definition,
    'if _moneda not in (''PEN'',''USD'') then',
    'if _moneda not in (''PEN'',''USD'',''MXN'',''COP'',''DOP'') then'
  );

  if v_updated = v_definition then
    raise exception 'No se pudo localizar la validación de moneda en public.crear_cotizacion_comercial; migración cancelada sin alterar la función.';
  end if;

  execute v_updated;
end;
$$;

comment on column public.cotizaciones.moneda is
  'ISO 4217 currency code for this quote. Supported: PEN, USD, MXN, COP, DOP. Values are not automatically converted.';
