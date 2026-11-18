-- Consolidación de datos comerciales:
-- pedido_comercial es la fuente canónica de teléfono, importes, documentos
-- y estado de venta/entrega. Las columnas históricas de pedidos se conservan
-- temporalmente para compatibilidad con datos/migraciones antiguas, pero ya no
-- forman parte del flujo actual de lectura/escritura de la aplicación.

create or replace function public.reparar_datos_comerciales_pedido(_pedido_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pedido_comercial (
    pedido_id,
    telefono,
    importe,
    a_cuenta,
    saldo,
    cotizacion_detalles,
    especificaciones_comerciales,
    ventas_estado,
    packing_estado,
    medio_envio,
    guia_envio,
    fecha_envio,
    fecha_entregado,
    receptor_envio,
    notas_ventas,
    fecha_listo_entrega,
    listo_entrega_observaciones,
    notas_envio,
    notas_entrega,
    usuario_listo_entrega,
    usuario_envio,
    usuario_entrega,
    ventas_actualizado_por,
    ventas_actualizado_en,
    enviado_at,
    entregado_at
  )
  select
    p.id,
    coalesce(nullif(p.telefono, ''), ''),
    coalesce(p.importe, 0),
    coalesce(p.a_cuenta, 0),
    greatest(coalesce(p.importe, 0) - coalesce(p.a_cuenta, 0), 0),
    coalesce(p.cotizacion_detalles, '{}'::jsonb),
    coalesce(p.especificaciones_comerciales, '{}'::jsonb),
    coalesce(p.ventas_estado, ''),
    coalesce(p.packing_estado, 'Pendiente'),
    coalesce(p.medio_envio, ''),
    coalesce(p.guia_envio, ''),
    p.fecha_envio,
    p.fecha_entregado,
    coalesce(p.receptor_envio, ''),
    coalesce(p.notas_ventas, ''),
    p.fecha_listo_entrega,
    coalesce(p.listo_entrega_observaciones, ''),
    coalesce(p.notas_envio, ''),
    coalesce(p.notas_entrega, ''),
    p.usuario_listo_entrega,
    p.usuario_envio,
    p.usuario_entrega,
    p.ventas_actualizado_por,
    p.ventas_actualizado_en,
    p.enviado_at,
    p.entregado_at
  from public.pedidos p
  where (_pedido_id is null or p.id = _pedido_id)
  on conflict (pedido_id) do nothing;
end;
$$;

-- Migra únicamente filas que todavía no tienen ficha comercial.
select public.reparar_datos_comerciales_pedido();

revoke all on function public.reparar_datos_comerciales_pedido(uuid) from public;
grant execute on function public.reparar_datos_comerciales_pedido(uuid) to authenticated;

comment on table public.pedido_comercial is
  'Fuente canónica de datos comerciales y de entrega del pedido. Las columnas comerciales históricas de pedidos están deprecadas.';
