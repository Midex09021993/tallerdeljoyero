-- Limpieza controlada del ecosistema de talleres.
-- Mantiene activos exclusivamente los cinco talleres autorizados.
-- No elimina sedes que tengan referencias operativas/históricas.

do $$
declare
  v_sede_id uuid;
  v_referenciada boolean;
  r record;
begin
  -- Normalizar los nombres canónicos de los cinco talleres.
  update public.sedes
  set nombre = case lower(trim(nombre))
    when 'fadilab' then 'FADILAB'
    when 'joyas bolivar' then 'JOYAS BOLIVAR'
    when 'siberiana' then 'SIBERIANA'
    when 'taller chanduvi' then 'Taller Chanduvi'
    when 'yamanik' then 'Yamanik'
    else nombre
  end,
  activa = case
    when lower(trim(nombre)) in (
      'fadilab',
      'joyas bolivar',
      'siberiana',
      'taller chanduvi',
      'yamanik'
    ) then true
    else false
  end,
  updated_at = now();

  -- Normalizar y mantener activos solo los participantes autorizados.
  update public.ecosistema_participantes
  set nombre = case lower(trim(nombre))
    when 'fadilab' then 'FADILAB'
    when 'joyas bolivar' then 'JOYAS BOLIVAR'
    when 'siberiana' then 'SIBERIANA'
    when 'taller chanduvi' then 'Taller Chanduvi'
    when 'yamanik' then 'Yamanik'
    else nombre
  end,
  estado = case
    when lower(trim(nombre)) in (
      'fadilab',
      'joyas bolivar',
      'siberiana',
      'taller chanduvi',
      'yamanik'
    ) then 'activo'
    else 'inactivo'
  end;

  -- Eliminar del Ecosistema los participantes no autorizados.
  -- Sus capacidades/cuentas se limpian por CASCADE.
  delete from public.ecosistema_participantes
  where lower(trim(nombre)) not in (
    'fadilab',
    'joyas bolivar',
    'siberiana',
    'taller chanduvi',
    'yamanik'
  );

  -- Eliminar físicamente solo sedes antiguas sin ninguna referencia.
  -- Si existe historial, la sede queda inactiva para conservar trazabilidad.
  for v_sede_id in
    select id
    from public.sedes
    where lower(trim(nombre)) not in (
      'fadilab',
      'joyas bolivar',
      'siberiana',
      'taller chanduvi',
      'yamanik'
    )
  loop
    v_referenciada := false;

    for r in
      select
        ns.nspname as schema_name,
        cls.relname as table_name,
        att.attname as column_name
      from pg_constraint con
      join pg_class cls on cls.oid = con.conrelid
      join pg_namespace ns on ns.oid = cls.relnamespace
      join pg_attribute att
        on att.attrelid = cls.oid
       and att.attnum = con.conkey[1]
      where con.contype = 'f'
        and con.confrelid = 'public.sedes'::regclass
        and array_length(con.conkey, 1) = 1
        and array_length(con.confkey, 1) = 1
        and ns.nspname not in ('pg_catalog', 'information_schema')
    loop
      begin
        execute format(
          'select exists (
             select 1
             from %I.%I
             where %I = $1
             limit 1
           )',
          r.schema_name,
          r.table_name,
          r.column_name
        )
        into v_referenciada
        using v_sede_id;

        if v_referenciada then
          exit;
        end if;
      exception
        when undefined_table or undefined_column then
          null;
      end;
    end loop;

    if not v_referenciada then
      delete from public.sedes where id = v_sede_id;
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
