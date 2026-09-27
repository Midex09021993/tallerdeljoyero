-- Verificacion final del perimetro y de la identidad operativa canonica.
-- Esta migracion NO crea datos de negocio ni elimina sedes.
-- Si una condicion estructural no se cumple, aborta para que Lovable reporte
-- la causa raiz antes de continuar.

begin;

do $$
declare
  v_count integer;
  v_missing integer;
  v_duplicate integer;
  v_policy_legacy integer;
begin
  -- Deben existir exactamente los cinco talleres autorizados como
  -- organizaciones activas integradas a una sede.
  select count(*)
    into v_count
  from public.ecosistema_participantes
  where tipo_participante = 'organizacion'
    and estado = 'activo'
    and sede_id is not null;

  if v_count <> 5 then
    raise exception
      'PERIMETRO_INVALIDO: se esperaban exactamente 5 organizaciones/talleres activos integrados a sede y se encontraron %',
      v_count;
  end if;

  -- Cada sede operativa solo puede tener un participante activo.
  select count(*)
    into v_duplicate
  from (
    select sede_id
    from public.ecosistema_participantes
    where estado = 'activo' and sede_id is not null
    group by sede_id
    having count(*) > 1
  ) d;

  if v_duplicate > 0 then
    raise exception
      'PERIMETRO_INVALIDO: existen % sedes con mas de un participante activo',
      v_duplicate;
  end if;

  -- Los nombres autorizados deben estar presentes.
  select count(*)
    into v_count
  from public.ecosistema_participantes
  where tipo_participante = 'organizacion'
    and estado = 'activo'
    and sede_id is not null
    and nombre in (
      'FADILAB',
      'JOYAS BOLIVAR',
      'SIBERIANA',
      'Taller Chanduvi',
      'Yamanik'
    );

  if v_count <> 5 then
    raise exception
      'PERIMETRO_INVALIDO: no coinciden los cinco talleres autorizados esperados; encontrados %',
      v_count;
  end if;

  -- Toda identidad operativa consolidada debe tener participante cuando
  -- conserva una sede legacy.
  select count(*)
    into v_missing
  from (
    select id from public.clientes where sede_id is not null and participante_id is null
    union all select id from public.config_areas where sede_id is not null and participante_id is null
    union all select id from public.contratos where sede_id is not null and participante_id is null
    union all select gen_random_uuid() from public.cotizacion_numeradores where sede_id is not null and participante_id is null
    union all select id from public.cotizaciones where sede_id is not null and participante_id is null
    union all select id from public.gastos where sede_id is not null and participante_id is null
    union all select id from public.inventario where sede_id is not null and participante_id is null
    union all select id from public.inventario_joyas where sede_id is not null and participante_id is null
    union all select id from public.inventario_joyas_importaciones where sede_id is not null and participante_id is null
    union all select id from public.ordenes_produccion where sede_id is not null and participante_id is null
    union all select id from public.pedido_entrega_eventos where sede_id is not null and participante_id is null
    union all select id from public.pedidos where sede_id is not null and participante_id is null
    union all select id from public.procesos where sede_id is not null and participante_id is null
    union all select id from public.profiles where sede_id is not null and participante_id is null
    union all select id from public.proyectos_joya where sede_id is not null and participante_id is null
    union all select id from public.tareas_taller where sede_id is not null and participante_id is null
    union all select id from public.trabajos where sede_id is not null and participante_id is null
    union all select id from public.user_roles where sede_id is not null and participante_id is null
    union all select id from public.identidades_comerciales where sede_id is not null and participante_id is null
    union all select id from public.compras where sede_id is not null and participante_id is null
    union all select id from public.catalogo_colecciones where sede_id is not null and participante_id is null
    union all select id from public.catalogo_productos where sede_id is not null and participante_id is null
    union all select id from public.catalogo_configuracion where sede_id is not null and participante_id is null
    union all select id from public.inventario_joya_eventos where sede_id is not null and participante_id is null
    union all select id from public.produccion_eventos where sede_id is not null and participante_id is null
    union all select id from public.tarifas_mano_obra where sede_id is not null and participante_id is null
  ) pendientes;

  if v_missing > 0 then
    raise exception
      'IDENTIDAD_INCOMPLETA: quedaron % registros con sede_id pero sin participante_id',
      v_missing;
  end if;

  -- Las funciones canonicas deben existir.
  if to_regprocedure('public.ve_sede(uuid,uuid)') is null then
    raise exception 'AUTORIZACION_INCOMPLETA: falta public.ve_sede(uuid,uuid)';
  end if;

  if to_regprocedure('public.sincronizar_participante_operativo()') is null then
    raise exception 'IDENTIDAD_INCOMPLETA: falta el trigger canonico';
  end if;

  -- No permitimos que las politicas nuevas vuelvan a autorizar mediante
  -- mi_sede(). mi_sede puede existir solo como compatibilidad legacy.
  select count(*)
    into v_policy_legacy
  from pg_policies
  where schemaname = 'public'
    and (
      coalesce(qual, '') ilike '%mi_sede(%'
      or coalesce(with_check, '') ilike '%mi_sede(%'
    );

  if v_policy_legacy > 0 then
    raise exception
      'AUTORIZACION_LEGACY: existen % politicas publicas que aun usan mi_sede()',
      v_policy_legacy;
  end if;
end;
$$;

commit;
