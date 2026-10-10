-- Mantiene la identidad comercial del documento público cuando una versión nueva
-- quedó sin identidad_comercial_id, usando únicamente la versión que reemplaza.
-- No actualiza filas ni altera datos históricos.
create or replace function private_api.seguimiento_cotizacion(_token text)
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
    case
      when ic.id is null then null::jsonb
      else jsonb_build_object(
        'id', ic.id,
        'nombre_comercial', ic.nombre_comercial,
        'razon_social', ic.razon_social,
        'ruc', ic.ruc,
        'rnp_bienes', ic.rnp_bienes,
        'rpp_servicios', ic.rpp_servicios,
        'logo_url', ic.logo_url,
        'email', ic.email,
        'telefono', ic.telefono,
        'whatsapp', ic.whatsapp,
        'direccion', ic.direccion,
        'ciudad', ic.ciudad,
        'sitio_web', ic.sitio_web,
        'color_principal', ic.color_principal,
        'pie_documento', ic.pie_documento,
        'metadata', ic.metadata,
        'activa', ic.activa
      )
    end,
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
  left join public.identidades_comerciales ic
    on ic.id = coalesce(
      c.identidad_comercial_id,
      (
        select anterior.identidad_comercial_id
        from public.cotizaciones anterior
        where anterior.id = c.reemplaza_id
        limit 1
      )
    )
  where c.seguimiento_token::text = lower(trim(_token))
    and c.estado in ('enviada', 'requiere_revision', 'aprobada', 'rechazada', 'vencida')
  limit 1;
$$;

revoke all on function private_api.seguimiento_cotizacion(text) from public, anon, authenticated;

create or replace function public.seguimiento_cotizacion(_token text)
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
  select * from private_api.seguimiento_cotizacion(_token);
$$;

revoke all on function public.seguimiento_cotizacion(text) from public, authenticated;
grant execute on function public.seguimiento_cotizacion(text) to anon;
