-- Cuota independiente de productos por catálogo y enforcement en base de datos.
-- Aplicar manualmente en Supabase SQL Editor después de 20261014193000_aurum_plan_quotas.sql.
begin;

alter table public.aurum_plan_quotas
  add column if not exists productos_catalogo_max integer not null default 30
  check (productos_catalogo_max >= -1);

-- Valores iniciales propuestos. -1 significa sin límite.
update public.aurum_plan_quotas
set productos_catalogo_max = case plan_id
  when 'emprendedor' then 30
  when 'taller' then 200
  when 'profesional' then 1000
  when 'empresarial' then -1
  else productos_catalogo_max
end;

create or replace function public.aurum_validar_cuota_catalogo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_limite integer;
  v_actuales integer;
begin
  -- Editar el producto de su taller actual no consume una plaza nueva.
  if tg_op = 'UPDATE' and new.participante_id = old.participante_id then
    return new;
  end if;

  -- Serializa altas del mismo taller para evitar superar el límite en inserciones simultáneas.
  perform pg_advisory_xact_lock(hashtext(new.participante_id::text));

  select coalesce(ep.metadata ->> 'plan_comercial', 'emprendedor')
    into v_plan
  from public.ecosistema_participantes ep
  where ep.id = new.participante_id;

  if v_plan is null then
    raise exception 'No se pudo determinar el plan comercial de este catálogo';
  end if;

  select q.productos_catalogo_max
    into v_limite
  from public.aurum_plan_quotas q
  where q.plan_id = v_plan;

  if v_limite is null then
    raise exception 'No existe una cuota de catálogo configurada para el plan %', v_plan;
  end if;

  if v_limite = -1 then
    return new;
  end if;

  select count(*)::integer into v_actuales
  from public.catalogo_productos p
  where p.participante_id = new.participante_id;

  if v_actuales >= v_limite then
    raise exception 'LIMITE_CATALOGO_ALCANZADO: tu plan permite hasta % productos. Elimina un producto o amplía tu plan.', v_limite;
  end if;

  return new;
end;
$$;

drop trigger if exists aurum_validar_cuota_catalogo_trg on public.catalogo_productos;
create trigger aurum_validar_cuota_catalogo_trg
before insert or update of participante_id on public.catalogo_productos
for each row execute function public.aurum_validar_cuota_catalogo();

revoke all on function public.aurum_validar_cuota_catalogo() from public, anon, authenticated;
notify pgrst, 'reload schema';
commit;
