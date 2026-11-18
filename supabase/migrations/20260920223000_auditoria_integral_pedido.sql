-- Auditoría integral del pedido: registra cambios comerciales, técnicos y operativos relevantes.
-- No guarda valores sensibles completos; conserva qué dimensión cambió y quién la modificó.

create or replace function public.registrar_auditoria_integral_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_accion text := null;
  v_nota text := '';
begin
  if old.area_actual is distinct from new.area_actual then
    v_accion := 'cambio_area';
    v_nota := concat_ws(' → ', coalesce(old.area_actual, 'Pedidos'), coalesce(new.area_actual, 'Pedidos'));
  elsif old.estado is distinct from new.estado then
    v_accion := 'cambio_estado';
    v_nota := concat_ws(' → ', coalesce(old.estado, ''), coalesce(new.estado, ''));
  elsif old.fecha_entrega is distinct from new.fecha_entrega then
    v_accion := 'cambio_fecha_entrega';
  elsif old.cliente_id is distinct from new.cliente_id then
    v_accion := 'asociacion_cliente';
  elsif old.cotizacion_id is distinct from new.cotizacion_id then
    v_accion := 'asociacion_cotizacion';
  elsif old.contrato_id is distinct from new.contrato_id then
    v_accion := 'asociacion_contrato';
  elsif old.proyecto_joya_id is distinct from new.proyecto_joya_id then
    v_accion := 'asociacion_proyecto';
  elsif old.trabajo is distinct from new.trabajo
     or old.material is distinct from new.material
     or old.talla is distinct from new.talla
     or old.cantidad_piezas is distinct from new.cantidad_piezas
     or old.piedras is distinct from new.piedras
     or old.peso_estimado is distinct from new.peso_estimado
  then
    v_accion := 'actualizacion_ficha_tecnica';
  elsif old.ruta is distinct from new.ruta then
    v_accion := 'actualizacion_ruta_produccion';
  elsif old.medio_envio is distinct from new.medio_envio
     or old.guia_envio is distinct from new.guia_envio
     or old.receptor_envio is distinct from new.receptor_envio
     or old.notas_entrega is distinct from new.notas_entrega
  then
    v_accion := 'actualizacion_entrega';
  end if;

  if v_accion is not null then
    insert into public.pedido_movimientos (
      pedido_id, area_origen, area_destino, accion, usuario_id, nota
    )
    values (
      new.id,
      coalesce(old.area_actual, 'Pedidos'),
      coalesce(new.area_actual, 'Pedidos'),
      v_accion,
      auth.uid(),
      v_nota
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_auditoria_integral_pedido on public.pedidos;

create trigger trg_auditoria_integral_pedido
after update on public.pedidos
for each row
execute function public.registrar_auditoria_integral_pedido();

create index if not exists pedido_movimientos_pedido_created_idx
  on public.pedido_movimientos(pedido_id, created_at desc);

comment on function public.registrar_auditoria_integral_pedido() is
  'Registra cambios relevantes del pedido en su historial operativo sin almacenar snapshots sensibles.';
