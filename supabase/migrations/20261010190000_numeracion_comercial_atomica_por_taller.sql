-- Numeración comercial atómica por taller.
-- Conserva los números históricos; los nuevos consecutivos se reservan en SQL.
-- El identificador del taller incluido en los nuevos códigos mantiene la unicidad global.

create or replace function public.codigo_taller_cotizacion(_sede_id uuid)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_nombre text;
  v_codigo text;
  v_id_corto text;
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
  v_id_corto := upper(right(replace(_sede_id::text, '-', ''), 8));

  return left(coalesce(nullif(v_codigo, ''), 'SEDE'), 8) || '-' || v_id_corto;
end;
$$;

-- Reconciliar el contador de cotizaciones con el máximo real, incluso si supera 4 dígitos.
insert into public.cotizacion_numeradores (sede_id, anio, ultimo_numero)
select
  c.sede_id,
  extract(year from c.fecha_emision)::integer,
  max(substring(c.numero from '([0-9]+)$')::integer)
from public.cotizaciones c
where c.sede_id is not null
group by c.sede_id, extract(year from c.fecha_emision)
on conflict (sede_id, anio)
do update set ultimo_numero = greatest(
  public.cotizacion_numeradores.ultimo_numero,
  excluded.ultimo_numero
);

-- Las inserciones directas de cotizaciones también usan el contador por taller.
create or replace function public.generar_numero_cotizacion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.numero is null or btrim(new.numero) = '' then
    if new.sede_id is null then
      raise exception 'El taller es obligatorio para numerar la cotización';
    end if;
    new.numero := public.siguiente_numero_cotizacion(
      new.sede_id,
      extract(year from coalesce(new.fecha_emision, current_date))::integer
    );
  end if;
  return new;
end;
$$;

create table if not exists public.contrato_numeradores (
  sede_id uuid not null references public.sedes(id) on delete restrict,
  anio integer not null check (anio between 2000 and 2100),
  ultimo_numero integer not null default 0 check (ultimo_numero >= 0),
  constraint contrato_numeradores_pkey primary key (sede_id, anio)
);

-- Reconstruye contadores existentes del nuevo formato sin renumerar contratos históricos.
insert into public.contrato_numeradores (sede_id, anio, ultimo_numero)
select
  c.sede_id,
  substring(c.numero from '^CTR-([0-9]{4})-')::integer as anio,
  max(substring(c.numero from '([0-9]+)$')::integer) as ultimo_numero
from public.contratos c
where c.sede_id is not null
  and c.numero ~ '^CTR-[0-9]{4}-.+-[0-9]+$'
  and c.numero like (
    'CTR-' || substring(c.numero from '^CTR-([0-9]{4})-') || '-' ||
    public.codigo_taller_cotizacion(c.sede_id) || '-%'
  )
group by c.sede_id, substring(c.numero from '^CTR-([0-9]{4})-')::integer
on conflict (sede_id, anio)
do update set ultimo_numero = greatest(
  public.contrato_numeradores.ultimo_numero,
  excluded.ultimo_numero
);

revoke all on table public.contrato_numeradores from public, anon, authenticated;

create or replace function public.siguiente_numero_contrato(_sede_id uuid, _anio integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
  v_codigo text;
  v_numero text;
begin
  if _sede_id is null then
    raise exception 'El taller es obligatorio para numerar el contrato';
  end if;
  if _anio < 2000 or _anio > 2100 then
    raise exception 'Año inválido para numerar el contrato';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('contrato:' || _sede_id::text || ':' || _anio::text, 0)
  );

  insert into public.contrato_numeradores (sede_id, anio, ultimo_numero)
  values (_sede_id, _anio, 1)
  on conflict (sede_id, anio)
  do update set ultimo_numero = public.contrato_numeradores.ultimo_numero + 1
  returning ultimo_numero into v_next;

  v_codigo := public.codigo_taller_cotizacion(_sede_id);
  v_numero := format('CTR-%s-%s-%s', _anio, v_codigo, lpad(v_next::text, 4, '0'));

  -- Mantiene UNIQUE(numero). Si hubiera una colisión excepcional, busca el siguiente
  -- número libre dentro del mismo bloqueo de taller/año.
  while exists (select 1 from public.contratos c where c.numero = v_numero) loop
    update public.contrato_numeradores
    set ultimo_numero = ultimo_numero + 1
    where sede_id = _sede_id and anio = _anio
    returning ultimo_numero into v_next;
    v_numero := format('CTR-%s-%s-%s', _anio, v_codigo, lpad(v_next::text, 4, '0'));
  end loop;

  return v_numero;
end;
$$;

revoke all on function public.siguiente_numero_contrato(uuid, integer) from public, anon, authenticated;

create or replace function public.crear_contrato_comercial(
  _cliente text,
  _telefono text,
  _origen text,
  _total numeric,
  _sede_id uuid,
  _notas text,
  _cotizacion_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cot public.cotizaciones%rowtype;
  v_cliente text := nullif(btrim(coalesce(_cliente, '')), '');
  v_telefono text := coalesce(btrim(_telefono), '');
  v_origen text := coalesce(nullif(btrim(_origen), ''), 'Contrato Aurum');
  v_notas text := coalesce(_notas, '');
  v_total numeric := greatest(0, coalesce(_total, 0));
  v_numero text;
  v_id uuid;
begin
  if not public.es_admin(auth.uid()) then
    raise exception 'No autorizado para crear contratos';
  end if;
  if _sede_id is null then
    raise exception 'Selecciona un taller para crear el contrato';
  end if;
  if v_cliente is null then
    raise exception 'El cliente es obligatorio';
  end if;

  if _cotizacion_id is not null then
    select * into v_cot
    from public.cotizaciones
    where id = _cotizacion_id
    for update;

    if not found then
      raise exception 'Cotización no encontrada';
    end if;
    if v_cot.estado <> 'aprobada' then
      raise exception 'Solo se puede crear un contrato desde una cotización aprobada';
    end if;
    if v_cot.sede_id is distinct from _sede_id then
      raise exception 'La cotización debe pertenecer al mismo taller del contrato';
    end if;

    select c.id, c.numero into v_id, v_numero
    from public.contratos c
    where c.cotizacion_id = _cotizacion_id
    limit 1;
    if found then
      return jsonb_build_object('id', v_id, 'numero', v_numero, 'creado', false);
    end if;

    select cl.nombre, coalesce(cl.telefono, '')
    into v_cliente, v_telefono
    from public.clientes cl
    where cl.id = v_cot.cliente_id;
    if v_cliente is null then
      raise exception 'No se encontró el cliente de la cotización';
    end if;

    v_origen := 'Cotización ' || v_cot.numero || ' v' || v_cot.version;
    v_notas := coalesce(v_cot.notas_internas, '');
    v_total := greatest(0, coalesce(v_cot.total, 0));
  end if;

  v_numero := public.siguiente_numero_contrato(_sede_id, extract(year from current_date)::integer);

  insert into public.contratos (
    numero, cliente, telefono, origen, total, abonado, sede_id, notas, cotizacion_id
  )
  values (
    v_numero, v_cliente, v_telefono, v_origen, v_total,
    0, _sede_id, v_notas, _cotizacion_id
  )
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'numero', v_numero, 'creado', true);
end;
$$;

revoke all on function public.crear_contrato_comercial(text, text, text, numeric, uuid, text, uuid) from public, anon;
grant execute on function public.crear_contrato_comercial(text, text, text, numeric, uuid, text, uuid) to authenticated;


-- La conversión existente conserva su comportamiento; solo comparte el numerador atómico.
create or replace function public.convertir_cotizacion_a_pedido_contrato(_cotizacion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cot public.cotizaciones%rowtype;
  v_cliente public.clientes%rowtype;
  v_contrato_id uuid;
  v_contrato_numero text;
  v_pedido_id uuid;
  v_existente_contrato uuid;
  v_resultado jsonb;
  v_next bigint;
  v_anio text;
begin
  if not public.es_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  select *
  into v_cot
  from public.cotizaciones
  where id = _cotizacion_id
  for update;

  if not found then
    raise exception 'Cotización no encontrada';
  end if;

  if v_cot.estado <> 'aprobada' then
    raise exception 'Solo se puede convertir una cotización aprobada';
  end if;

  select *
  into v_cliente
  from public.clientes
  where id = v_cot.cliente_id;

  if not found then
    raise exception 'Cliente de la cotización no encontrado';
  end if;

  select id
  into v_existente_contrato
  from public.contratos
  where cotizacion_id = _cotizacion_id
  limit 1;

  if v_existente_contrato is not null then
    v_resultado := public.convertir_cotizacion_a_pedido(_cotizacion_id);
    v_pedido_id := nullif(v_resultado->>'pedido_id', '')::uuid;

    update public.pedidos
    set contrato_id = v_existente_contrato,
        contrato = (select numero from public.contratos where id = v_existente_contrato),
        updated_at = now()
    where id = v_pedido_id;

    return jsonb_build_object(
      'pedido_id', v_pedido_id,
      'contrato_id', v_existente_contrato,
      'contrato_numero', (select numero from public.contratos where id = v_existente_contrato),
      'creado', false
    );
  end if;

  v_anio := to_char(current_date, 'YYYY');
  v_contrato_numero := public.siguiente_numero_contrato(v_cot.sede_id, v_anio::integer);

  insert into public.contratos (
    numero,
    cliente,
    telefono,
    origen,
    total,
    abonado,
    sede_id,
    notas,
    cotizacion_id
  )
  values (
    v_contrato_numero,
    v_cliente.nombre,
    coalesce(v_cliente.telefono, ''),
    'Cotización ' || v_cot.numero || ' v' || v_cot.version,
    greatest(0, coalesce(v_cot.total, 0)),
    0,
    v_cot.sede_id,
    coalesce(v_cot.notas_internas, ''),
    _cotizacion_id
  )
  returning id into v_contrato_id;

  v_resultado := public.convertir_cotizacion_a_pedido(_cotizacion_id);
  v_pedido_id := nullif(v_resultado->>'pedido_id', '')::uuid;

  update public.pedidos
  set contrato_id = v_contrato_id,
      contrato = v_contrato_numero,
      updated_at = now()
  where id = v_pedido_id;

  return jsonb_build_object(
    'pedido_id', v_pedido_id,
    'contrato_id', v_contrato_id,
    'contrato_numero', v_contrato_numero,
    'creado', true
  );
end;
$$;

revoke all on function public.convertir_cotizacion_a_pedido_contrato(uuid) from public, anon;
grant execute on function public.convertir_cotizacion_a_pedido_contrato(uuid) to authenticated;

notify pgrst, 'reload schema';
