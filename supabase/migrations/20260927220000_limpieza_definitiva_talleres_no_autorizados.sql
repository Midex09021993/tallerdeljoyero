-- Limpieza definitiva del ecosistema no autorizado.
-- Regla: conservar únicamente FADILAB, JOYAS BOLIVAR, SIBERIANA,
-- Taller Chanduvi y Yamanik. El resto se elimina con su historial y
-- usuarios exclusivos, sin tocar registros de las cinco sedes autorizadas.
--
-- Esta migración es deliberadamente defensiva:
-- 1) valida primero el perímetro autorizado;
-- 2) elimina hijos antes que padres;
-- 3) elimina usuarios solo cuando no tienen relación autorizada;
-- 4) verifica que no queden referencias antes de borrar sedes;
-- 5) cualquier inconsistencia provoca ROLLBACK de toda la migración.

do $$
declare
  v_autorizadas integer;
  v_participantes integer;
  v_restantes integer;
  r record;
begin
  create temp table if not exists _cleanup_sedes_excluidas (
    id uuid primary key
  ) on commit drop;

  create temp table if not exists _cleanup_usuarios (
    id uuid primary key
  ) on commit drop;

  truncate _cleanup_sedes_excluidas;
  truncate _cleanup_usuarios;

  -- ============================================================
  -- 1. VALIDAR EL PERÍMETRO: EXACTAMENTE LAS CINCO SEDES
  -- ============================================================
  select count(*)
    into v_autorizadas
  from public.sedes
  where lower(trim(nombre)) in (
    'fadilab',
    'joyas bolivar',
    'siberiana',
    'taller chanduvi',
    'yamanik'
  );

  if v_autorizadas <> 5 then
    raise exception
      'Limpieza abortada: se esperaban exactamente 5 sedes autorizadas y se encontraron %',
      v_autorizadas;
  end if;

  -- Cada sede autorizada debe estar integrada al Ecosistema.
  select count(*)
    into v_participantes
  from public.ecosistema_participantes ep
  join public.sedes s on s.id = ep.sede_id
  where lower(trim(s.nombre)) in (
    'fadilab',
    'joyas bolivar',
    'siberiana',
    'taller chanduvi',
    'yamanik'
  )
    and lower(trim(ep.nombre)) in (
      'fadilab',
      'joyas bolivar',
      'siberiana',
      'taller chanduvi',
      'yamanik'
    );

  if v_participantes <> 5 then
    raise exception
      'Limpieza abortada: las cinco sedes autorizadas no tienen los cinco vínculos de Ecosistema esperados; encontrados %',
      v_participantes;
  end if;

  -- Reactivar explícitamente solo el perímetro autorizado.
  update public.sedes
     set activa = true,
         updated_at = now()
   where lower(trim(nombre)) in (
     'fadilab',
     'joyas bolivar',
     'siberiana',
     'taller chanduvi',
     'yamanik'
   );

  update public.ecosistema_participantes
     set estado = 'activo',
         updated_at = now()
   where lower(trim(nombre)) in (
     'fadilab',
     'joyas bolivar',
     'siberiana',
     'taller chanduvi',
     'yamanik'
   );

  -- Sedes fuera del perímetro.
  insert into _cleanup_sedes_excluidas(id)
  select id
  from public.sedes
  where lower(trim(nombre)) not in (
    'fadilab',
    'joyas bolivar',
    'siberiana',
    'taller chanduvi',
    'yamanik'
  );

  -- ============================================================
  -- 2. CAPTURAR USUARIOS EXCLUSIVOS DE SEDES/PARTICIPANTES
  -- ============================================================
  insert into _cleanup_usuarios(id)
  select distinct p.id
  from public.profiles p
  where p.sede_id in (select id from _cleanup_sedes_excluidas)
  on conflict do nothing;

  insert into _cleanup_usuarios(id)
  select distinct ur.user_id
  from public.user_roles ur
  where ur.sede_id in (select id from _cleanup_sedes_excluidas)
  on conflict do nothing;

  -- También capturamos usuarios ligados a participantes no autorizados,
  -- antes de eliminar las cuentas de participante.
  insert into _cleanup_usuarios(id)
  select distinct pc.user_id
  from public.participante_cuentas pc
  join public.ecosistema_participantes ep on ep.id = pc.participante_id
  where lower(trim(ep.nombre)) not in (
    'fadilab',
    'joyas bolivar',
    'siberiana',
    'taller chanduvi',
    'yamanik'
  )
  on conflict do nothing;

  -- ============================================================
  -- 3. HISTORIAL PRODUCTIVO: HIJOS -> PADRES
  -- ============================================================
  delete from public.control_calidad cc
   where cc.orden_produccion_id in (
     select op.id from public.ordenes_produccion op
     where op.sede_id in (select id from _cleanup_sedes_excluidas)
   );

  delete from public.trabajo_tiempos tt
   where tt.trabajo_id in (
     select t.id from public.trabajos t
     where t.sede_id in (select id from _cleanup_sedes_excluidas)
   );

  delete from public.trabajo_archivos ta
   where ta.trabajo_id in (
     select t.id from public.trabajos t
     where t.sede_id in (select id from _cleanup_sedes_excluidas)
   );

  delete from public.orden_produccion_costos opc
   where opc.orden_produccion_id in (
     select op.id from public.ordenes_produccion op
     where op.sede_id in (select id from _cleanup_sedes_excluidas)
   );

  delete from public.orden_produccion_entregas ope
   where ope.orden_produccion_id in (
     select op.id from public.ordenes_produccion op
     where op.sede_id in (select id from _cleanup_sedes_excluidas)
   );

  delete from public.piezas_terminadas pt
   where pt.orden_produccion_id in (
     select op.id from public.ordenes_produccion op
     where op.sede_id in (select id from _cleanup_sedes_excluidas)
   )
      or pt.pedido_id in (
     select p.id from public.pedidos p
     where p.sede_id in (select id from _cleanup_sedes_excluidas)
   );

  delete from public.produccion_eventos pe
   where pe.sede_id in (select id from _cleanup_sedes_excluidas)
      or pe.pedido_id in (
     select p.id from public.pedidos p
     where p.sede_id in (select id from _cleanup_sedes_excluidas)
   );

  delete from public.inventario_movimientos im
   where im.pedido_id in (
     select p.id from public.pedidos p
     where p.sede_id in (select id from _cleanup_sedes_excluidas)
   )
      or im.orden_produccion_id in (
     select op.id from public.ordenes_produccion op
     where op.sede_id in (select id from _cleanup_sedes_excluidas)
   )
      or im.material_id in (
     select i.id from public.inventario i
     where i.sede_id in (select id from _cleanup_sedes_excluidas)
   );

  delete from public.ordenes_produccion op
   where op.sede_id in (select id from _cleanup_sedes_excluidas);

  delete from public.trabajos t
   where t.sede_id in (select id from _cleanup_sedes_excluidas);

  -- Hijos comerciales/operativos de pedidos.
  delete from public.pedido_materiales pm
   where pm.pedido_id in (
     select p.id from public.pedidos p
     where p.sede_id in (select id from _cleanup_sedes_excluidas)
   );

  delete from public.pedido_archivos pa
   where pa.pedido_id in (
     select p.id from public.pedidos p
     where p.sede_id in (select id from _cleanup_sedes_excluidas)
   );

  delete from public.pedido_movimientos pm
   where pm.pedido_id in (
     select p.id from public.pedidos p
     where p.sede_id in (select id from _cleanup_sedes_excluidas)
   );

  delete from public.pedido_entrega_eventos pee
   where pee.sede_id in (select id from _cleanup_sedes_excluidas);

  delete from public.pedido_comercial pc
   where pc.pedido_id in (
     select p.id from public.pedidos p
     where p.sede_id in (select id from _cleanup_sedes_excluidas)
   );

  delete from public.pedidos p
   where p.sede_id in (select id from _cleanup_sedes_excluidas);

  -- ============================================================
  -- 4. COMERCIAL: COTIZACIONES, CONTRATOS, PROYECTOS, CLIENTES
  -- ============================================================
  delete from public.contrato_pagos cp
   where cp.contrato_id in (
     select c.id from public.contratos c
     where c.sede_id in (select id from _cleanup_sedes_excluidas)
   );

  delete from public.contrato_documentos cd
   where cd.contrato_id in (
     select c.id from public.contratos c
     where c.sede_id in (select id from _cleanup_sedes_excluidas)
   );

  delete from public.contratos c
   where c.sede_id in (select id from _cleanup_sedes_excluidas);

  delete from public.cotizaciones q
   where q.sede_id in (select id from _cleanup_sedes_excluidas);

  delete from public.proyectos_joya pj
   where pj.sede_id in (select id from _cleanup_sedes_excluidas);

  delete from public.clientes c
   where c.sede_id in (select id from _cleanup_sedes_excluidas);

  -- ============================================================
  -- 5. INVENTARIO Y CATÁLOGOS PROPIOS DE LA SEDE
  -- ============================================================
  delete from public.inventario_joya_eventos ije
   where ije.sede_id in (select id from _cleanup_sedes_excluidas);

  delete from public.inventario_joyas ij
   where ij.sede_id in (select id from _cleanup_sedes_excluidas);

  delete from public.inventario_movimientos im
   where im.material_id in (
     select i.id from public.inventario i
     where i.sede_id in (select id from _cleanup_sedes_excluidas)
   );

  delete from public.inventario i
   where i.sede_id in (select id from _cleanup_sedes_excluidas);

  -- ============================================================
  -- 6. PARTICIPANTES NO AUTORIZADOS
  -- ============================================================
  delete from public.participante_especialidades pe
   using public.ecosistema_participantes ep
   where pe.participante_id = ep.id
     and lower(trim(ep.nombre)) not in (
       'fadilab',
       'joyas bolivar',
       'siberiana',
       'taller chanduvi',
       'yamanik'
     );

  delete from public.participante_cuentas pc
   using public.ecosistema_participantes ep
   where pc.participante_id = ep.id
     and lower(trim(ep.nombre)) not in (
       'fadilab',
       'joyas bolivar',
       'siberiana',
       'taller chanduvi',
       'yamanik'
     );

  delete from public.ecosistema_participantes ep
   where lower(trim(ep.nombre)) not in (
     'fadilab',
     'joyas bolivar',
     'siberiana',
     'taller chanduvi',
     'yamanik'
   );

  -- ============================================================
  -- 7. TODA TABLA RESTANTE CON FK DIRECTA A SEDES
  -- ============================================================
  -- Esto cubre módulos que puedan haber sido añadidos por migraciones
  -- anteriores/nuevas y evita dejar datos de una sede excluida.
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
      and ns.nspname = 'public'
      and cls.relname not in (
        'sedes',
        'profiles',
        'user_roles',
        'ecosistema_participantes'
      )
  loop
    begin
      execute format(
        'delete from %I.%I where %I in (select id from _cleanup_sedes_excluidas)',
        r.schema_name,
        r.table_name,
        r.column_name
      );
    exception
      when foreign_key_violation then
        -- Se deja para la verificación final. Si queda alguna referencia,
        -- la migración completa hace ROLLBACK y no deja una limpieza parcial.
        null;
    end;
  end loop;

  -- ============================================================
  -- 8. ROLES/PERFILES Y USUARIOS
  -- ============================================================
  delete from public.user_roles ur
   where ur.sede_id in (select id from _cleanup_sedes_excluidas);

  delete from public.profiles p
   where p.sede_id in (select id from _cleanup_sedes_excluidas);

  -- No eliminar usuarios compartidos con el perímetro autorizado ni
  -- cuentas globales de dueño/gerente.
  delete from _cleanup_usuarios cu
   where exists (
     select 1
     from public.profiles p
     where p.id = cu.id
       and p.sede_id not in (select id from _cleanup_sedes_excluidas)
       and p.sede_id is not null
   )
   or exists (
     select 1
     from public.user_roles ur
     where ur.user_id = cu.id
       and (
         ur.sede_id is null
         or ur.sede_id not in (select id from _cleanup_sedes_excluidas)
         or ur.role in ('dueno','gerente')
       )
   )
   or exists (
     select 1
     from public.participante_cuentas pc
     join public.ecosistema_participantes ep on ep.id = pc.participante_id
     where pc.user_id = cu.id
       and lower(trim(ep.nombre)) in (
         'fadilab',
         'joyas bolivar',
         'siberiana',
         'taller chanduvi',
         'yamanik'
       )
   );

  -- Eliminar relaciones secundarias antes de auth.users.
  delete from public.user_areas ua
   where ua.user_id in (select id from _cleanup_usuarios);

  delete from auth.users au
   where au.id in (select id from _cleanup_usuarios);

  -- ============================================================
  -- 9. VERIFICACIÓN ANTES DE BORRAR SEDES
  -- ============================================================
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
      and ns.nspname = 'public'
      and cls.relname <> 'sedes'
  loop
    execute format(
      'select count(*) from %I.%I where %I in (select id from _cleanup_sedes_excluidas)',
      r.schema_name,
      r.table_name,
      r.column_name
    )
    into v_restantes;

    if v_restantes > 0 then
      raise exception
        'Limpieza abortada: quedaron % referencias a sedes excluidas en %.%',
        v_restantes,
        r.table_name,
        r.column_name;
    end if;
  end loop;

  -- ============================================================
  -- 10. BORRAR SEDES EXCLUIDAS
  -- ============================================================
  delete from public.sedes
   where id in (select id from _cleanup_sedes_excluidas);

  -- ============================================================
  -- 11. VERIFICACIÓN FINAL DEL PERÍMETRO
  -- ============================================================
  select count(*)
    into v_autorizadas
  from public.sedes
  where lower(trim(nombre)) in (
    'fadilab',
    'joyas bolivar',
    'siberiana',
    'taller chanduvi',
    'yamanik'
  );

  if v_autorizadas <> 5 then
    raise exception
      'Limpieza abortada: la verificación final encontró % sedes autorizadas',
      v_autorizadas;
  end if;
end;
$$;

notify pgrst, 'reload schema';
