-- Alinea el portal público y el versionado con el esquema real de cotizaciones.
-- La base de producción usa identidad_comercial_id (no la columna JSON identidad_comercial).

alter table public.cotizaciones
  add column if not exists seguimiento_token uuid
  not null
  default gen_random_uuid();

create unique index if not exists cotizaciones_seguimiento_token_uidx
  on public.cotizaciones (seguimiento_token);

alter table public.cotizaciones
  add column if not exists seguimiento_codigo text
  not null
  default upper(substr(md5(gen_random_uuid()::text), 1, 8));

create unique index if not exists cotizaciones_seguimiento_codigo_uidx
  on public.cotizaciones (seguimiento_codigo);

alter table public.cotizacion_detalles
  add column if not exists metadata jsonb
  not null
  default '{}'::jsonb;

alter table public.cotizacion_detalles
  add column if not exists updated_at timestamptz
  not null
  default now();

alter table public.cotizaciones
  drop constraint if exists cotizaciones_estado_check;

alter table public.cotizaciones
  add constraint cotizaciones_estado_check
  check (estado in ('borrador','enviada','requiere_revision','aprobada','rechazada','vencida','cancelada'));

create schema if not exists private_api;

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
  left join public.identidades_comerciales ic on ic.id = c.identidad_comercial_id
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

create or replace function public.seguimiento_cotizacion_codigo(_codigo text)
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
  select *
  from private_api.seguimiento_cotizacion(
    (
      select c.seguimiento_token::text
      from public.cotizaciones c
      where c.seguimiento_codigo = upper(trim(_codigo))
        and c.estado in ('enviada', 'requiere_revision', 'aprobada', 'rechazada', 'vencida')
      limit 1
    )
  );
$$;

revoke all on function public.seguimiento_cotizacion_codigo(text) from public, authenticated;
grant execute on function public.seguimiento_cotizacion_codigo(text) to anon;

create table if not exists public.cotizacion_respuestas_cliente (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid not null references public.cotizaciones(id) on delete cascade,
  accion text not null check (accion in ('aprobada','requiere_revision','rechazada')),
  comentario text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists cotizacion_respuestas_cliente_cotizacion_idx
  on public.cotizacion_respuestas_cliente(cotizacion_id, created_at desc);

alter table public.cotizacion_respuestas_cliente enable row level security;

revoke all on table public.cotizacion_respuestas_cliente from public, anon, authenticated;

create or replace function public.responder_cotizacion_cliente(
  _codigo text,
  _accion text,
  _comentario text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cotizacion_id uuid;
  v_estado text;
  v_accion text := lower(trim(coalesce(_accion, '')));
  v_comentario text := btrim(coalesce(_comentario, ''));
begin
  if v_accion not in ('aprobada', 'requiere_revision', 'rechazada') then
    raise exception 'Acción de cotización no válida';
  end if;

  if v_accion in ('requiere_revision', 'rechazada') and length(v_comentario) < 3 then
    raise exception 'Debes indicar un comentario o motivo';
  end if;

  select c.id, c.estado
    into v_cotizacion_id, v_estado
  from public.cotizaciones c
  where c.seguimiento_codigo = upper(trim(_codigo))
     or c.seguimiento_token::text = lower(trim(_codigo))
  limit 1
  for update;

  if v_cotizacion_id is null then
    raise exception 'Cotización no encontrada';
  end if;

  if v_estado <> 'enviada' then
    raise exception 'Esta cotización ya no está disponible para responder';
  end if;

  insert into public.cotizacion_respuestas_cliente (
    cotizacion_id,
    accion,
    comentario
  )
  values (
    v_cotizacion_id,
    v_accion,
    v_comentario
  );

  update public.cotizaciones
     set estado = v_accion,
         updated_at = now()
   where id = v_cotizacion_id;

  return jsonb_build_object(
    'cotizacion_id', v_cotizacion_id,
    'estado', v_accion
  );
end;
$$;

revoke all on function public.responder_cotizacion_cliente(text, text, text) from public, authenticated;
grant execute on function public.responder_cotizacion_cliente(text, text, text) to anon;

create or replace function public.crear_version_cotizacion(_cotizacion_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_original public.cotizaciones%rowtype;
  v_nueva_id uuid;
  v_nueva_version integer;
begin
  if not public.es_admin((select auth.uid())) then
    raise exception 'No autorizado';
  end if;

  select * into v_original
  from public.cotizaciones
  where id = _cotizacion_id
  for update;

  if not found then
    raise exception 'Cotización no encontrada';
  end if;

  if v_original.estado not in ('enviada','requiere_revision','rechazada','vencida') then
    raise exception 'Solo se puede crear una nueva versión desde una cotización enviada, con cambios solicitados, rechazada o vencida';
  end if;

  select coalesce(max(version), 0) + 1
    into v_nueva_version
  from public.cotizaciones
  where numero = v_original.numero;

  insert into public.cotizaciones (
    numero, version, cliente_id, proyecto_joya_id, sede_id, estado,
    fecha_emision, fecha_vencimiento, moneda,
    subtotal_costo, subtotal, descuento, impuestos, total, anticipo,
    notas_cliente, notas_internas,
    identidad_comercial_id, reemplaza_id, creado_por
  )
  select
    v_original.numero, v_nueva_version, cliente_id, proyecto_joya_id, sede_id, 'borrador',
    current_date, fecha_vencimiento, moneda,
    subtotal_costo, subtotal, descuento, impuestos, total, 0,
    notas_cliente, notas_internas,
    identidad_comercial_id, v_original.id, (select auth.uid())
  from public.cotizaciones
  where id = v_original.id
  returning id into v_nueva_id;

  insert into public.cotizacion_detalles (
    cotizacion_id, orden, tipo, descripcion, cantidad, unidad,
    costo_unitario, precio_unitario, metadata
  )
  select
    v_nueva_id, orden, tipo, descripcion, cantidad, unidad,
    costo_unitario, precio_unitario, metadata
  from public.cotizacion_detalles
  where cotizacion_id = v_original.id
  order by orden;

  return v_nueva_id;
end;
$$;

revoke all on function public.crear_version_cotizacion(uuid) from public, anon;
grant execute on function public.crear_version_cotizacion(uuid) to authenticated;
