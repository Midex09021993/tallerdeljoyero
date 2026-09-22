-- Numeración comercial por taller y año.
-- Cada sede mantiene su propio consecutivo: COT-2026-NOMBRETALLER-0001.
-- El consecutivo se reserva dentro de la misma transacción para evitar duplicados concurrentes.

create table if not exists public.cotizacion_numeradores (
  sede_id uuid not null references public.sedes(id) on delete restrict,
  anio integer not null,
  ultimo_numero integer not null default 0,
  constraint cotizacion_numeradores_pkey primary key (sede_id, anio),
  constraint cotizacion_numeradores_anio_chk check (anio between 2000 and 2100),
  constraint cotizacion_numeradores_ultimo_chk check (ultimo_numero >= 0)
);

create or replace function public.codigo_taller_cotizacion(_sede_id uuid)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_nombre text;
  v_codigo text;
begin
  select nombre into v_nombre from public.sedes where id = _sede_id;
  if v_nombre is null then
    raise exception 'Taller no encontrado';
  end if;

  v_codigo := regexp_replace(
    translate(upper(trim(v_nombre)), 'ÁÉÍÓÚÜÑ', 'AEIOUUN'),
    '[^A-Z0-9]+',
    '',
    'g'
  );

  return left(coalesce(nullif(v_codigo, ''), 'SEDE'), 12);
end;
$$;

create or replace function public.siguiente_numero_cotizacion(_sede_id uuid, _anio integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
  v_codigo text;
begin
  if _sede_id is null then
    raise exception 'El taller es obligatorio para numerar la cotización';
  end if;

  if _anio < 2000 or _anio > 2100 then
    raise exception 'Año inválido para numerar la cotización';
  end if;

  -- Bloqueo lógico por taller/año: dos cotizaciones simultáneas no pueden
  -- recibir el mismo consecutivo.
  perform pg_advisory_xact_lock(
    hashtextextended(_sede_id::text || ':' || _anio::text, 0)
  );

  insert into public.cotizacion_numeradores (sede_id, anio, ultimo_numero)
  values (_sede_id, _anio, 1)
  on conflict (sede_id, anio)
  do update set ultimo_numero = public.cotizacion_numeradores.ultimo_numero + 1
  returning ultimo_numero into v_next;

  v_codigo := public.codigo_taller_cotizacion(_sede_id);

  return format('COT-%s-%s-%s', _anio, v_codigo, lpad(v_next::text, 4, '0'));
end;
$$;

-- Normaliza las cotizaciones existentes para que también pertenezcan
-- a la secuencia de su propio taller/año.
with numeradas as (
  select
    c.id,
    c.sede_id,
    extract(year from c.fecha_emision)::integer as anio,
    row_number() over (
      partition by c.sede_id, extract(year from c.fecha_emision)
      order by c.fecha_emision, c.created_at, c.id
    ) as consecutivo
  from public.cotizaciones c
  where c.sede_id is not null
)
update public.cotizaciones c
set numero = format(
  'COT-%s-%s-%s',
  n.anio,
  public.codigo_taller_cotizacion(n.sede_id),
  lpad(n.consecutivo::text, 4, '0')
)
from numeradas n
where c.id = n.id;

insert into public.cotizacion_numeradores (sede_id, anio, ultimo_numero)
select
  c.sede_id,
  extract(year from c.fecha_emision)::integer as anio,
  max(
    substring(
      c.numero from '-([0-9]{4})$'
    )::integer
  ) as ultimo_numero
from public.cotizaciones c
where c.sede_id is not null
group by c.sede_id, extract(year from c.fecha_emision)
on conflict (sede_id, anio)
do update set ultimo_numero = greatest(
  public.cotizacion_numeradores.ultimo_numero,
  excluded.ultimo_numero
);

create unique index if not exists cotizaciones_sede_numero_unique
  on public.cotizaciones (sede_id, numero)
  where sede_id is not null;

-- La función comercial existente conserva su API pública.
create or replace function public.crear_cotizacion_comercial(
  _cliente_id uuid,
  _cliente_nombre text,
  _cliente_telefono text,
  _cliente_email text,
  _proyecto_joya_id uuid,
  _sede_id uuid,
  _moneda text,
  _cantidad numeric,
  _costo_unitario numeric,
  _precio_unitario numeric,
  _descuento numeric,
  _impuestos numeric,
  _fecha_vencimiento date,
  _fecha_entrega_solicitada date,
  _notas_cliente text,
  _notas_internas text,
  _descripcion text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_cliente_id uuid := _cliente_id;
  v_cotizacion_id uuid;
  v_cliente_sede uuid;
  v_proyecto_sede uuid;
  v_numero text;
  v_anio integer := extract(year from current_date)::integer;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if not private.usuario_puede_ventas(v_uid, _sede_id) then raise exception 'Sin permisos para crear cotizaciones en este taller'; end if;
  if _sede_id is null then raise exception 'El taller/sede es obligatorio'; end if;
  if _moneda not in ('PEN','USD') then raise exception 'Moneda no válida'; end if;
  if coalesce(_cantidad, 0) <= 0 then raise exception 'La cantidad debe ser mayor que cero'; end if;
  if coalesce(_precio_unitario, 0) <= 0 then raise exception 'El precio al cliente debe ser mayor que cero'; end if;
  if coalesce(_costo_unitario, 0) < 0 or coalesce(_descuento, 0) < 0 or coalesce(_impuestos, 0) < 0 then raise exception 'Los importes no pueden ser negativos'; end if;
  if nullif(btrim(coalesce(_descripcion, '')), '') is null then raise exception 'La cotización debe tener un concepto'; end if;

  if v_cliente_id is null then
    if nullif(btrim(coalesce(_cliente_nombre, '')), '') is null then raise exception 'El cliente es obligatorio'; end if;
    insert into public.clientes (nombre, telefono, email, sede_id, estado, creado_por)
    values (btrim(_cliente_nombre), nullif(btrim(coalesce(_cliente_telefono, '')), ''), nullif(btrim(coalesce(_cliente_email, '')), ''), _sede_id, 'activo', v_uid)
    returning id into v_cliente_id;
  else
    select sede_id into v_cliente_sede from public.clientes where id = v_cliente_id for share;
    if not found then raise exception 'Cliente no encontrado'; end if;
    if not public.es_admin(v_uid) and v_cliente_sede is distinct from _sede_id then raise exception 'El cliente no pertenece al taller activo'; end if;
  end if;

  if _proyecto_joya_id is not null then
    select sede_id into v_proyecto_sede from public.proyectos_joya where id = _proyecto_joya_id for share;
    if not found then raise exception 'Proyecto de joya no encontrado'; end if;
    if not public.es_admin(v_uid) and v_proyecto_sede is distinct from _sede_id then raise exception 'El proyecto no pertenece al taller activo'; end if;
  end if;

  v_numero := public.siguiente_numero_cotizacion(_sede_id, v_anio);

  insert into public.cotizaciones (
    numero, cliente_id, proyecto_joya_id, sede_id, estado, moneda,
    subtotal_costo, subtotal, descuento, impuestos, total,
    notas_cliente, notas_internas, creado_por, fecha_vencimiento, fecha_entrega_solicitada
  )
  values (
    v_numero, v_cliente_id, _proyecto_joya_id, _sede_id, 'borrador', _moneda,
    round(coalesce(_costo_unitario, 0) * _cantidad, 2),
    round(coalesce(_precio_unitario, 0) * _cantidad, 2),
    round(coalesce(_descuento, 0), 2),
    round(coalesce(_impuestos, 0), 2),
    greatest(0, round(coalesce(_precio_unitario, 0) * _cantidad - coalesce(_descuento, 0) + coalesce(_impuestos, 0), 2)),
    coalesce(_notas_cliente, ''), coalesce(_notas_internas, ''), v_uid, _fecha_vencimiento, _fecha_entrega_solicitada
  )
  returning id into v_cotizacion_id;

  insert into public.cotizacion_detalles (
    cotizacion_id, orden, tipo, descripcion, cantidad, unidad, costo_unitario, precio_unitario
  )
  values (
    v_cotizacion_id, 1, 'otro', btrim(_descripcion), _cantidad, 'und',
    coalesce(_costo_unitario, 0), coalesce(_precio_unitario, 0)
  );

  return v_cotizacion_id;
end;
$$;

revoke all on function public.siguiente_numero_cotizacion(uuid,integer) from public, anon;
grant execute on function public.siguiente_numero_cotizacion(uuid,integer) to authenticated;

revoke all on function public.crear_cotizacion_comercial(
  uuid,text,text,text,uuid,uuid,text,numeric,numeric,numeric,numeric,numeric,date,date,text,text,text
) from public, anon;

grant execute on function public.crear_cotizacion_comercial(
  uuid,text,text,text,uuid,uuid,text,numeric,numeric,numeric,numeric,numeric,date,date,text,text,text
) to authenticated;
