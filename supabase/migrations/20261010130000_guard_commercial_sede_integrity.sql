-- Prevent cross-sede links in new commercial writes.
-- Historical rows are not modified; Lovable Cloud applies this migration.
begin;

create or replace function public.validar_integridad_sede_comercial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sede_relacionada uuid;
begin
  if new.sede_id is null then
    return new;
  end if;

  if tg_table_name = 'cotizaciones' then
    if new.cliente_id is not null then
      select c.sede_id into v_sede_relacionada
      from public.clientes c
      where c.id = new.cliente_id;

      if not found then
        raise exception 'El cliente de la cotización no existe';
      end if;
      if v_sede_relacionada is distinct from new.sede_id then
        raise exception 'El cliente debe pertenecer a la misma sede de la cotización';
      end if;
    end if;
    return new;
  end if;

  if tg_table_name = 'pedidos' then
    if new.cliente_id is not null then
      select c.sede_id into v_sede_relacionada
      from public.clientes c
      where c.id = new.cliente_id;

      if not found then
        raise exception 'El cliente del pedido no existe';
      end if;
      if v_sede_relacionada is distinct from new.sede_id then
        raise exception 'El cliente debe pertenecer a la misma sede del pedido';
      end if;
    end if;

    if new.cotizacion_id is not null then
      select c.sede_id into v_sede_relacionada
      from public.cotizaciones c
      where c.id = new.cotizacion_id;

      if not found then
        raise exception 'La cotización de origen no existe';
      end if;
      if v_sede_relacionada is distinct from new.sede_id then
        raise exception 'La cotización de origen debe pertenecer a la misma sede del pedido';
      end if;
    end if;

    if new.contrato_id is not null then
      select c.sede_id into v_sede_relacionada
      from public.contratos c
      where c.id = new.contrato_id;

      if not found then
        raise exception 'El contrato financiero no existe';
      end if;
      if v_sede_relacionada is distinct from new.sede_id then
        raise exception 'El contrato financiero debe pertenecer a la misma sede del pedido';
      end if;
    end if;
    return new;
  end if;

  return new;
end;
$$;

revoke all on function public.validar_integridad_sede_comercial() from public, anon, authenticated;

drop trigger if exists trg_validar_sede_cotizaciones on public.cotizaciones;
create trigger trg_validar_sede_cotizaciones
before insert or update of sede_id, cliente_id on public.cotizaciones
for each row execute function public.validar_integridad_sede_comercial();

drop trigger if exists trg_validar_sede_pedidos on public.pedidos;
create trigger trg_validar_sede_pedidos
before insert or update of sede_id, cliente_id, cotizacion_id, contrato_id on public.pedidos
for each row execute function public.validar_integridad_sede_comercial();

commit;
