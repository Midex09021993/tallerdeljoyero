-- Auditoría automática del tramo comercial: listo, despacho y entrega.
-- Mantiene el historial aunque el cambio se origine desde otra pantalla del ERP.

create or replace function public.registrar_auditoria_comercial_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_accion text;
  v_nota text;
begin
  if new.estado in ('Listo para Entrega', 'En Camino', 'Entregado')
     and (
       old.estado is distinct from new.estado
       or old.ventas_estado is distinct from new.ventas_estado
       or old.packing_estado is distinct from new.packing_estado
       or old.entregado_at is distinct from new.entregado_at
       or old.enviado_at is distinct from new.enviado_at
     )
  then
    v_accion := case new.estado
      when 'Listo para Entrega' then 'listo_para_entrega'
      when 'En Camino' then 'despacho'
      when 'Entregado' then 'entrega'
      else 'actualizacion_comercial'
    end;

    v_nota := case new.estado
      when 'Listo para Entrega' then coalesce(nullif(trim(new.listo_entrega_observaciones), ''), 'Pedido preparado para entrega.')
      when 'En Camino' then concat_ws(' · ',
        nullif(trim(new.medio_envio), ''),
        nullif(trim(new.guia_envio), '')
      )
      when 'Entregado' then concat_ws(' · ',
        nullif(trim(new.receptor_envio), ''),
        nullif(trim(new.notas_entrega), '')
      )
      else ''
    end;

    insert into public.pedido_movimientos (
      pedido_id, area_origen, area_destino, accion, usuario_id, nota
    )
    values (
      new.id,
      coalesce(old.area_actual, 'Área ventas'),
      'Área ventas',
      v_accion,
      auth.uid(),
      v_nota
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_auditoria_comercial_pedido on public.pedidos;

create trigger trg_auditoria_comercial_pedido
after update on public.pedidos
for each row
execute function public.registrar_auditoria_comercial_pedido();

comment on function public.registrar_auditoria_comercial_pedido() is
  'Registra automáticamente en pedido_movimientos el ciclo comercial de listo, despacho y entrega.';
