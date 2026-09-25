-- Fuente financiera única para pedidos con documento comercial.
-- Recepción no registra "a cuenta". Los pagos son movimientos de contrato.

create or replace function public.validar_contrato_pago()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_total numeric;
  v_pagado numeric;
begin
  select c.total
    into v_total
  from public.contratos c
  where c.id = new.contrato_id
  for update;

  if not found then
    raise exception 'El documento comercial no existe';
  end if;

  select coalesce(sum(cp.monto), 0)
    into v_pagado
  from public.contrato_pagos cp
  where cp.contrato_id = new.contrato_id
    and (tg_op <> 'UPDATE' or cp.id <> old.id);

  if v_pagado + new.monto > v_total then
    raise exception 'El pago supera el saldo disponible. Saldo actual: %, pago: %',
      greatest(v_total - v_pagado, 0), new.monto;
  end if;

  return new;
end;
$$;

create or replace function public.recalcular_contrato_financiero()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_contrato_id uuid;
  v_pagado numeric;
  v_total numeric;
begin
  v_contrato_id := case when tg_op = 'DELETE' then old.contrato_id else new.contrato_id end;

  select c.total
    into v_total
  from public.contratos c
  where c.id = v_contrato_id
  for update;

  if found then
    select coalesce(sum(cp.monto), 0)
      into v_pagado
    from public.contrato_pagos cp
    where cp.contrato_id = v_contrato_id;

    update public.contratos
    set abonado = v_pagado,
        saldo = greatest(v_total - v_pagado, 0),
        updated_at = now()
    where id = v_contrato_id;
  end if;

  if tg_op = 'UPDATE' and old.contrato_id is distinct from new.contrato_id then
    select c.total
      into v_total
    from public.contratos c
    where c.id = old.contrato_id
    for update;

    if found then
      select coalesce(sum(cp.monto), 0)
        into v_pagado
      from public.contrato_pagos cp
      where cp.contrato_id = old.contrato_id;

      update public.contratos
      set abonado = v_pagado,
          saldo = greatest(v_total - v_pagado, 0),
          updated_at = now()
      where id = old.contrato_id;
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists contrato_pagos_validar_saldo on public.contrato_pagos;
create trigger contrato_pagos_validar_saldo
before insert or update on public.contrato_pagos
for each row
execute function public.validar_contrato_pago();

drop trigger if exists contrato_pagos_recalcular_contrato on public.contrato_pagos;
create trigger contrato_pagos_recalcular_contrato
after insert or update or delete on public.contrato_pagos
for each row
execute function public.recalcular_contrato_financiero();

-- Recalcula acumulados históricos desde los movimientos reales.
update public.contratos c
set abonado = coalesce(x.pagado, 0),
    saldo = greatest(c.total - coalesce(x.pagado, 0), 0),
    updated_at = now()
from (
  select contrato_id, sum(monto) as pagado
  from public.contrato_pagos
  group by contrato_id
) x
where x.contrato_id = c.id;

update public.contratos c
set abonado = 0,
    saldo = greatest(c.total, 0),
    updated_at = now()
where not exists (
  select 1
  from public.contrato_pagos cp
  where cp.contrato_id = c.id
);

-- Área ventas puede registrar pagos de documentos de su propia sede.
-- La modificación/eliminación administrativa de pagos queda reservada
-- a dueño/gerente.
drop policy if exists "contrato_pagos gestionar" on public.contrato_pagos;
drop policy if exists "contrato_pagos insertar ventas" on public.contrato_pagos;
drop policy if exists "contrato_pagos modificar admin" on public.contrato_pagos;
drop policy if exists "contrato_pagos eliminar admin" on public.contrato_pagos;

create policy "contrato_pagos insertar ventas"
on public.contrato_pagos
for insert
to authenticated
with check (
  public.es_admin(auth.uid())
  or exists (
    select 1
    from public.contratos c
    where c.id = contrato_pagos.contrato_id
      and public.ve_sede(auth.uid(), c.sede_id)
      and exists (
        select 1
        from public.user_areas ua
        where ua.user_id = auth.uid()
          and lower(trim(ua.area)) = lower('Área ventas')
      )
  )
);

create policy "contrato_pagos modificar admin"
on public.contrato_pagos
for update
to authenticated
using (public.es_admin(auth.uid()))
with check (public.es_admin(auth.uid()));

create policy "contrato_pagos eliminar admin"
on public.contrato_pagos
for delete
to authenticated
using (public.es_admin(auth.uid()));
