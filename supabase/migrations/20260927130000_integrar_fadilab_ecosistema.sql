-- Consolidar el ecosistema actual sin volver a crear talleres eliminados.
-- Solo incorpora la sede corporativa que falta: Gerencia general -> FADILAB.
do $$
declare
  v_sede_id uuid;
  v_participante_id uuid;
begin
  -- 1. Reutilizar la sede existente y renombrarla.
  select id into v_sede_id
  from public.sedes
  where lower(trim(nombre)) = 'fadilab'
  limit 1;

  if v_sede_id is null then
    select id into v_sede_id
    from public.sedes
    where lower(trim(nombre)) = 'gerencia general'
    limit 1;

    if v_sede_id is not null then
      update public.sedes
      set nombre = 'FADILAB',
          updated_at = now()
      where id = v_sede_id;
    end if;
  end if;

  if v_sede_id is null then
    raise exception 'No existe la sede Gerencia general/FADILAB para integrarla al Ecosistema';
  end if;

  -- 2. Si ya existe el participante de Ecosistema, solo lo vinculamos a la sede.
  select id into v_participante_id
  from public.ecosistema_participantes
  where sede_id = v_sede_id
  limit 1;

  if v_participante_id is null then
    select id into v_participante_id
    from public.ecosistema_participantes
    where lower(trim(nombre)) in ('gerencia general', 'fadilab')
    limit 1;

    if v_participante_id is not null then
      update public.ecosistema_participantes
      set nombre = 'FADILAB',
          sede_id = v_sede_id,
          tipo_participante = 'organizacion',
          estado = 'activo'
      where id = v_participante_id;
    else
      insert into public.ecosistema_participantes (
        sede_id, tipo_participante, nombre, ciudad, descripcion, estado
      )
      select
        s.id,
        'organizacion',
        'FADILAB',
        s.ciudad,
        'Organización corporativa del grupo.',
        case when s.activa then 'activo' else 'inactivo' end
      from public.sedes s
      where s.id = v_sede_id;
    end if;
  else
    update public.ecosistema_participantes
    set nombre = 'FADILAB'
    where id = v_participante_id;
  end if;
end;
$$;

notify pgrst, 'reload schema';
