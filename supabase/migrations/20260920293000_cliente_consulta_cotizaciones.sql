alter table public.cotizaciones
  add column if not exists seguimiento_token uuid not null default gen_random_uuid();

create unique index if not exists cotizaciones_seguimiento_token_uidx
  on public.cotizaciones (seguimiento_token);

drop function if exists public.seguimiento_cotizacion(text);

create function public.seguimiento_cotizacion(_token text)
returns table (
  numero text,
  version integer,
  cliente text,
  trabajo text,
  sede text,
  estado text,
  fecha_emision date,
  fecha_vencimiento date,
  fecha_entrega_solicitada date,
  moneda text,
  subtotal numeric,
  descuento numeric,
  impuestos numeric,
  total numeric,
  anticipo numeric,
  notas_cliente text,
  identidad_comercial jsonb,
  especificaciones jsonb,
  detalles jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.numero,
    c.version,
    cl.nombre,
    coalesce(nullif(pj.nombre, ''), 'Propuesta de joyería'),
    s.nombre,
    c.estado,
    c.fecha_emision,
    c.fecha_vencimiento,
    c.fecha_entrega_solicitada,
    c.moneda,
    c.subtotal,
    c.descuento,
    c.impuestos,
    c.total,
    c.anticipo,
    c.notas_cliente,
    c.identidad_comercial,
    jsonb_build_object(
      'nombre', pj.nombre,
      'descripcion', pj.descripcion,
      'metal', pj.metal,
      'ley', pj.ley,
      'piedras', pj.piedras,
      'talla', pj.talla,
      'peso_estimado', pj.peso_estimado,
      'cantidad_piezas', pj.cantidad_piezas
    ),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'orden', d.orden,
            'tipo', d.tipo,
            'descripcion', d.descripcion,
            'cantidad', d.cantidad,
            'unidad', d.unidad,
            'precio_unitario', d.precio_unitario,
            'total_precio', d.total_precio,
            'metadata', d.metadata
          )
          order by d.orden
        )
        from public.cotizacion_detalles d
        where d.cotizacion_id = c.id
      ),
      '[]'::jsonb
    )
  from public.cotizaciones c
  join public.clientes cl on cl.id = c.cliente_id
  left join public.proyectos_joya pj on pj.id = c.proyecto_joya_id
  left join public.sedes s on s.id = c.sede_id
  where c.seguimiento_token::text = lower(trim(_token))
    and c.estado in ('enviada', 'aprobada', 'rechazada', 'vencida')
  limit 1;
$$;

revoke all on function public.seguimiento_cotizacion(text) from public, anon, authenticated;
grant execute on function public.seguimiento_cotizacion(text) to anon, authenticated;
