-- Establece el perímetro canónico de talleres autorizado.
-- Esta migración NO elimina sedes ni usuarios. Solo garantiza que las cinco
-- organizaciones existan y estén vinculadas 1:1 con un participante del ecosistema.
-- La limpieza definitiva posterior se encarga de eliminar todo lo demás.

do $$
declare
  v_sede_id uuid;
  v_participante_id uuid;
  v_count integer;
  r record;
begin
  -- Crear las cinco sedes autorizadas solo si todavía no existen.
  insert into public.sedes (nombre, ciudad, modo, activa)
  values
    ('FADILAB', 'Trujillo', 'completo', true),
    ('JOYAS BOLIVAR', 'Medellín', 'completo', true),
    ('SIBERIANA', 'Lima', 'completo', true),
    ('Taller Chanduvi', 'Chiclayo', 'completo', true),
    ('Yamanik', 'Chiclayo', 'completo', true)
  on conflict (nombre) do update
    set ciudad = excluded.ciudad,
        activa = true,
        updated_at = now();

  -- Cada sede autorizada debe tener exactamente un participante organización.
  for r in
    select id, nombre, ciudad
    from public.sedes
    where lower(trim(nombre)) in (
      'fadilab',
      'joyas bolivar',
      'siberiana',
      'taller chanduvi',
      'yamanik'
    )
  loop
    select ep.id
      into v_participante_id
    from public.ecosistema_participantes ep
    where lower(trim(ep.nombre)) = lower(trim(r.nombre))
      and ep.tipo_participante = 'organizacion'
    order by ep.created_at
    limit 1;

    if v_participante_id is null then
      insert into public.ecosistema_participantes
        (tipo_participante, nombre, ciudad, estado)
      values
        ('organizacion', r.nombre, r.ciudad, 'activo')
      returning id into v_participante_id;
    else
      update public.ecosistema_participantes
         set nombre = r.nombre,
             ciudad = r.ciudad,
             estado = 'activo',
             updated_at = now()
       where id = v_participante_id;
    end if;

    update public.ecosistema_participantes
       set sede_id = r.id,
           updated_at = now()
     where id = v_participante_id;

    -- No permitimos que otro participante use la misma sede.
    if exists (
      select 1
      from public.ecosistema_participantes ep
      where ep.sede_id = r.id
        and ep.id <> v_participante_id
    ) then
      raise exception
        'Perímetro abortado: la sede % está vinculada a más de un participante',
        r.nombre;
    end if;
  end loop;

  select count(*)
    into v_count
  from public.sedes
  where lower(trim(nombre)) in (
    'fadilab',
    'joyas bolivar',
    'siberiana',
    'taller chanduvi',
    'yamanik'
  );

  if v_count <> 5 then
    raise exception 'Perímetro abortado: se esperaban 5 sedes autorizadas y hay %', v_count;
  end if;

  select count(*)
    into v_count
  from public.ecosistema_participantes ep
  join public.sedes s on s.id = ep.sede_id
  where lower(trim(s.nombre)) in (
    'fadilab',
    'joyas bolivar',
    'siberiana',
    'taller chanduvi',
    'yamanik'
  )
    and ep.tipo_participante = 'organizacion';

  if v_count <> 5 then
    raise exception
      'Perímetro abortado: se esperaban 5 participantes organización vinculados y hay %',
      v_count;
  end if;

  -- Integridad 1:1 del perímetro.
  if exists (
    select 1
    from public.ecosistema_participantes ep
    join public.sedes s on s.id = ep.sede_id
    where lower(trim(s.nombre)) in (
      'fadilab',
      'joyas bolivar',
      'siberiana',
      'taller chanduvi',
      'yamanik'
    )
    group by ep.sede_id
    having count(*) <> 1
  ) then
    raise exception 'Perímetro abortado: existe una sede autorizada con vínculo participante duplicado';
  end if;
end;
$$;

notify pgrst, 'reload schema';