-- Consolidar el taller operativo en ecosistema_participantes.
-- Fase 1: migrar la identidad de taller desde sedes hacia participante_id.
-- NO elimina sedes todavía: primero se migra y verifica toda la dependencia.
-- Regla: un taller operativo es un ecosistema_participante de tipo organizacion.

do $$
declare
  v_missing integer;
begin
  -- 1. Validar que toda sede operativa tenga exactamente un participante
  -- integrado antes de mover datos.
  select count(*)
    into v_missing
  from public.sedes s
  where not exists (
    select 1
    from public.ecosistema_participantes ep
    where ep.sede_id = s.id
  );

  if v_missing > 0 then
    raise exception
      'Consolidacion abortada: existen % sedes sin participante de Ecosistema', v_missing;
  end if;

  -- 2. Agregar la nueva referencia canónica.
  alter table public.clientes add column if not exists participante_id uuid;
  alter table public.config_areas add column if not exists participante_id uuid;
  alter table public.contratos add column if not exists participante_id uuid;
  alter table public.cotizacion_numeradores add column if not exists participante_id uuid;
  alter table public.cotizaciones add column if not exists participante_id uuid;
  alter table public.gastos add column if not exists participante_id uuid;
  alter table public.inventario add column if not exists participante_id uuid;
  alter table public.inventario_joyas add column if not exists participante_id uuid;
  alter table public.inventario_joyas_importaciones add column if not exists participante_id uuid;
  alter table public.ordenes_produccion add column if not exists participante_id uuid;
  alter table public.pedido_entrega_eventos add column if not exists participante_id uuid;
  alter table public.pedidos add column if not exists participante_id uuid;
  alter table public.procesos add column if not exists participante_id uuid;
  alter table public.profiles add column if not exists participante_id uuid;
  alter table public.proyectos_joya add column if not exists participante_id uuid;
  alter table public.tareas_taller add column if not exists participante_id uuid;
  alter table public.trabajos add column if not exists participante_id uuid;
  alter table public.user_roles add column if not exists participante_id uuid;

  -- 3. Poblar desde la relación actualmente existente sede -> ecosistema.
  update public.clientes c
     set participante_id = ep.id
    from public.ecosistema_participantes ep
   where c.participante_id is null
     and c.sede_id = ep.sede_id;

  update public.config_areas c
     set participante_id = ep.id
    from public.ecosistema_participantes ep
   where c.participante_id is null
     and c.sede_id = ep.sede_id;

  update public.contratos c
     set participante_id = ep.id
    from public.ecosistema_participantes ep
   where c.participante_id is null
     and c.sede_id = ep.sede_id;

  update public.cotizacion_numeradores c
     set participante_id = ep.id
    from public.ecosistema_participantes ep
   where c.participante_id is null
     and c.sede_id = ep.sede_id;

  update public.cotizaciones c
     set participante_id = ep.id
    from public.ecosistema_participantes ep
   where c.participante_id is null
     and c.sede_id = ep.sede_id;

  update public.gastos c
     set participante_id = ep.id
    from public.ecosistema_participantes ep
   where c.participante_id is null
     and c.sede_id = ep.sede_id;

  update public.inventario c
     set participante_id = ep.id
    from public.ecosistema_participantes ep
   where c.participante_id is null
     and c.sede_id = ep.sede_id;

  update public.inventario_joyas c
     set participante_id = ep.id
    from public.ecosistema_participantes ep
   where c.participante_id is null
     and c.sede_id = ep.sede_id;

  update public.inventario_joyas_importaciones c
     set participante_id = ep.id
    from public.ecosistema_participantes ep
   where c.participante_id is null
     and c.sede_id = ep.sede_id;

  update public.ordenes_produccion c
     set participante_id = ep.id
    from public.ecosistema_participantes ep
   where c.participante_id is null
     and c.sede_id = ep.sede_id;

  update public.pedido_entrega_eventos c
     set participante_id = ep.id
    from public.ecosistema_participantes ep
   where c.participante_id is null
     and c.sede_id = ep.sede_id;

  update public.pedidos c
     set participante_id = ep.id
    from public.ecosistema_participantes ep
   where c.participante_id is null
     and c.sede_id = ep.sede_id;

  update public.procesos c
     set participante_id = ep.id
    from public.ecosistema_participantes ep
   where c.participante_id is null
     and c.sede_id = ep.sede_id;

  update public.profiles c
     set participante_id = ep.id
    from public.ecosistema_participantes ep
   where c.participante_id is null
     and c.sede_id = ep.sede_id;

  update public.proyectos_joya c
     set participante_id = ep.id
    from public.ecosistema_participantes ep
   where c.participante_id is null
     and c.sede_id = ep.sede_id;

  update public.tareas_taller c
     set participante_id = ep.id
    from public.ecosistema_participantes ep
   where c.participante_id is null
     and c.sede_id = ep.sede_id;

  update public.trabajos c
     set participante_id = ep.id
    from public.ecosistema_participantes ep
   where c.participante_id is null
     and c.sede_id = ep.sede_id;

  update public.user_roles c
     set participante_id = ep.id
    from public.ecosistema_participantes ep
   where c.participante_id is null
     and c.sede_id = ep.sede_id;

  -- 4. Crear las FK canónicas.
  alter table public.clientes
    drop constraint if exists clientes_participante_id_fkey;
  alter table public.clientes
    add constraint clientes_participante_id_fkey
    foreign key (participante_id) references public.ecosistema_participantes(id)
    on delete set null;

  alter table public.config_areas
    drop constraint if exists config_areas_participante_id_fkey;
  alter table public.config_areas
    add constraint config_areas_participante_id_fkey
    foreign key (participante_id) references public.ecosistema_participantes(id)
    on delete cascade;

  alter table public.contratos
    drop constraint if exists contratos_participante_id_fkey;
  alter table public.contratos
    add constraint contratos_participante_id_fkey
    foreign key (participante_id) references public.ecosistema_participantes(id)
    on delete set null;

  alter table public.cotizacion_numeradores
    drop constraint if exists cotizacion_numeradores_participante_id_fkey;
  alter table public.cotizacion_numeradores
    add constraint cotizacion_numeradores_participante_id_fkey
    foreign key (participante_id) references public.ecosistema_participantes(id)
    on delete restrict;

  alter table public.cotizaciones
    drop constraint if exists cotizaciones_participante_id_fkey;
  alter table public.cotizaciones
    add constraint cotizaciones_participante_id_fkey
    foreign key (participante_id) references public.ecosistema_participantes(id)
    on delete set null;

  alter table public.gastos
    drop constraint if exists gastos_participante_id_fkey;
  alter table public.gastos
    add constraint gastos_participante_id_fkey
    foreign key (participante_id) references public.ecosistema_participantes(id)
    on delete set null;

  alter table public.inventario
    drop constraint if exists inventario_participante_id_fkey;
  alter table public.inventario
    add constraint inventario_participante_id_fkey
    foreign key (participante_id) references public.ecosistema_participantes(id)
    on delete restrict;

  alter table public.inventario_joyas
    drop constraint if exists inventario_joyas_participante_id_fkey;
  alter table public.inventario_joyas
    add constraint inventario_joyas_participante_id_fkey
    foreign key (participante_id) references public.ecosistema_participantes(id)
    on delete restrict;

  alter table public.inventario_joyas_importaciones
    drop constraint if exists inventario_joyas_importaciones_participante_id_fkey;
  alter table public.inventario_joyas_importaciones
    add constraint inventario_joyas_importaciones_participante_id_fkey
    foreign key (participante_id) references public.ecosistema_participantes(id)
    on delete restrict;

  alter table public.ordenes_produccion
    drop constraint if exists ordenes_produccion_participante_id_fkey;
  alter table public.ordenes_produccion
    add constraint ordenes_produccion_participante_id_fkey
    foreign key (participante_id) references public.ecosistema_participantes(id)
    on delete restrict;

  alter table public.pedido_entrega_eventos
    drop constraint if exists pedido_entrega_eventos_participante_id_fkey;
  alter table public.pedido_entrega_eventos
    add constraint pedido_entrega_eventos_participante_id_fkey
    foreign key (participante_id) references public.ecosistema_participantes(id)
    on delete restrict;

  alter table public.pedidos
    drop constraint if exists pedidos_participante_id_fkey;
  alter table public.pedidos
    add constraint pedidos_participante_id_fkey
    foreign key (participante_id) references public.ecosistema_participantes(id)
    on delete set null;

  alter table public.procesos
    drop constraint if exists procesos_participante_id_fkey;
  alter table public.procesos
    add constraint procesos_participante_id_fkey
    foreign key (participante_id) references public.ecosistema_participantes(id)
    on delete set null;

  alter table public.profiles
    drop constraint if exists profiles_participante_id_fkey;
  alter table public.profiles
    add constraint profiles_participante_id_fkey
    foreign key (participante_id) references public.ecosistema_participantes(id)
    on delete set null;

  alter table public.proyectos_joya
    drop constraint if exists proyectos_joya_participante_id_fkey;
  alter table public.proyectos_joya
    add constraint proyectos_joya_participante_id_fkey
    foreign key (participante_id) references public.ecosistema_participantes(id)
    on delete set null;

  alter table public.tareas_taller
    drop constraint if exists tareas_taller_participante_id_fkey;
  alter table public.tareas_taller
    add constraint tareas_taller_participante_id_fkey
    foreign key (participante_id) references public.ecosistema_participantes(id)
    on delete set null;

  alter table public.trabajos
    drop constraint if exists trabajos_participante_id_fkey;
  alter table public.trabajos
    add constraint trabajos_participante_id_fkey
    foreign key (participante_id) references public.ecosistema_participantes(id)
    on delete set null;

  alter table public.user_roles
    drop constraint if exists user_roles_participante_id_fkey;
  alter table public.user_roles
    add constraint user_roles_participante_id_fkey
    foreign key (participante_id) references public.ecosistema_participantes(id)
    on delete cascade;

  -- 5. Índices para autorización y aislamiento.
  create index if not exists clientes_participante_idx on public.clientes(participante_id);
  create index if not exists config_areas_participante_idx on public.config_areas(participante_id);
  create index if not exists contratos_participante_idx on public.contratos(participante_id);
  create index if not exists cotizacion_numeradores_participante_idx on public.cotizacion_numeradores(participante_id);
  create index if not exists cotizaciones_participante_idx on public.cotizaciones(participante_id);
  create index if not exists gastos_participante_idx on public.gastos(participante_id);
  create index if not exists inventario_participante_idx on public.inventario(participante_id);
  create index if not exists inventario_joyas_participante_idx on public.inventario_joyas(participante_id);
  create index if not exists inventario_joyas_importaciones_participante_idx on public.inventario_joyas_importaciones(participante_id);
  create index if not exists ordenes_produccion_participante_idx on public.ordenes_produccion(participante_id);
  create index if not exists pedidos_participante_idx on public.pedidos(participante_id);
  create index if not exists perfiles_participante_idx on public.profiles(participante_id);
  create index if not exists proyectos_joya_participante_idx on public.proyectos_joya(participante_id);
  create index if not exists tareas_taller_participante_idx on public.tareas_taller(participante_id);
  create index if not exists trabajos_participante_idx on public.trabajos(participante_id);
  create index if not exists user_roles_participante_idx on public.user_roles(participante_id);

  -- 6. Verificación: ningún registro que antes pertenecía a una sede
  -- puede quedar sin su participante equivalente.
  -- sede_especialidades no recibe participante_id: es una relación N:N
  -- de compatibilidad y su equivalente canónico es participante_especialidades.
  if exists (
    select 1
    from public.ecosistema_participantes ep
    join public.sedes s on s.id = ep.sede_id
    join public.sede_especialidades se on se.sede_id = s.id
    left join public.participante_especialidades pe
      on pe.participante_id = ep.id
     and pe.especialidad_id = se.especialidad_id
    where pe.participante_id is null
  ) then
    raise exception 'Consolidacion abortada: existen capacidades de sede sin equivalente en participante_especialidades';
  end if;

  select count(*)
    into v_missing
  from (
    select id from public.clientes where sede_id is not null and participante_id is null
    union all
    select id from public.config_areas where sede_id is not null and participante_id is null
    union all
    select id from public.contratos where sede_id is not null and participante_id is null
    union all
    select gen_random_uuid() from public.cotizacion_numeradores where sede_id is not null and participante_id is null
    union all
    select id from public.cotizaciones where sede_id is not null and participante_id is null
    union all
    select id from public.gastos where sede_id is not null and participante_id is null
    union all
    select id from public.inventario where sede_id is not null and participante_id is null
    union all
    select id from public.inventario_joyas where sede_id is not null and participante_id is null
    union all
    select id from public.inventario_joyas_importaciones where sede_id is not null and participante_id is null
    union all
    select id from public.ordenes_produccion where sede_id is not null and participante_id is null
    union all
    select id from public.pedido_entrega_eventos where sede_id is not null and participante_id is null
    union all
    select id from public.pedidos where sede_id is not null and participante_id is null
    union all
    select id from public.procesos where sede_id is not null and participante_id is null
    union all
    select id from public.profiles where sede_id is not null and participante_id is null
    union all
    select id from public.proyectos_joya where sede_id is not null and participante_id is null
    union all
    select id from public.tareas_taller where sede_id is not null and participante_id is null
    union all
    select id from public.trabajos where sede_id is not null and participante_id is null
    union all
    select id from public.user_roles where sede_id is not null and participante_id is null
  ) x;

  if v_missing > 0 then
    raise exception
      'Consolidacion abortada: quedaron % registros sin participante_id', v_missing;
  end if;
end;
$$;
