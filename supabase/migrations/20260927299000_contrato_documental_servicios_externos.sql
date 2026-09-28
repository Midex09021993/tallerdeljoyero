-- Contrato documental por servicio externo.
-- No crea tablas nuevas: reutiliza pedido_archivos + trabajo_archivos.
-- Entrada: archivos que el taller receptor necesita para ejecutar.
-- Salida: archivos que el receptor debe devolver al taller de origen.

begin;

create or replace function public.validar_requisitos_servicio_externo(
  _trabajo_id uuid,
  _momento text default 'enviar'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_trabajo public.trabajos;
  v_ext text;
  v_tiene_entrada boolean := false;
  v_tiene_salida boolean := false;
  v_ficha boolean := false;
  v_mensaje text := 'Servicio listo';
begin
  if v_uid is null then
    raise exception 'Sesión no válida';
  end if;

  select t.* into v_trabajo
  from public.trabajos t
  where t.id = _trabajo_id;

  if v_trabajo.id is null then
    raise exception 'Trabajo no encontrado';
  end if;

  if v_trabajo.tipo = 'externo' then
    if not (
      public.es_admin(v_uid)
      or exists (
        select 1
        from public.participante_cuentas pc
        where pc.user_id = v_uid
          and pc.participante_id = v_trabajo.participante_id
          and pc.estado = 'activo'
      )
    ) then
      raise exception 'No tienes acceso a este servicio externo';
    end if;
  elsif not public.es_admin(v_uid) then
    raise exception 'Solo un administrador puede preparar los requisitos de un servicio externo';
  end if;

  -- La ficha técnica es estructurada y viaja mediante obtener_ficha_servicio_externo.
  -- No se exige un PDF adicional para Casting/Taller.
  v_ficha := true;

  select lower(regexp_replace(pa.nombre, '^.*\\.', ''))
    into v_ext
  from public.trabajo_archivos ta
  join public.pedido_archivos pa on pa.id = ta.pedido_archivo_id
  where ta.trabajo_id = v_trabajo.id
    and pa.es_vigente_fabricacion = true
  limit 1;

  if lower(trim(v_trabajo.area)) = 'impresión 3d' then
    select exists (
      select 1
      from public.pedido_archivos pa
      where pa.pedido_id = v_trabajo.pedido_id
        and pa.es_vigente_fabricacion = true
        and lower(regexp_replace(pa.nombre, '^.*\\.', '')) = 'stl'
    ) into v_tiene_entrada;

    if not v_tiene_entrada then
      v_mensaje := 'Falta el archivo STL requerido para Impresión 3D';
    end if;

  elsif lower(trim(v_trabajo.area)) = 'corte láser' then
    select exists (
      select 1
      from public.pedido_archivos pa
      where pa.pedido_id = v_trabajo.pedido_id
        and pa.es_vigente_fabricacion = true
        and lower(regexp_replace(pa.nombre, '^.*\\.', '')) in ('dxf','svg','pdf')
    ) into v_tiene_entrada;

    if not v_tiene_entrada then
      v_mensaje := 'Falta el archivo DXF, SVG o PDF requerido para Corte Láser';
    end if;
  else
    v_tiene_entrada := true;
  end if;

  if lower(trim(v_trabajo.area)) = 'diseño 3d' then
    select exists (
      select 1
      from public.trabajo_archivos ta
      join public.pedido_archivos pa on pa.id = ta.pedido_archivo_id
      where ta.trabajo_id = v_trabajo.id
        and pa.es_vigente_fabricacion = true
        and lower(regexp_replace(pa.nombre, '^.*\\.', '')) = '3dm'
    ) into v_tiene_salida;

    if lower(coalesce(_momento, 'enviar')) = 'completar' and not v_tiene_salida then
      v_mensaje := 'Falta la entrega obligatoria del archivo 3DM para Diseño 3D';
    end if;
  else
    v_tiene_salida := true;
  end if;

  return jsonb_build_object(
    'trabajo_id', v_trabajo.id,
    'area', v_trabajo.area,
    'momento', coalesce(_momento, 'enviar'),
    'ficha_tecnica', v_ficha,
    'entrada_requerida',
      case
        when lower(trim(v_trabajo.area)) = 'impresión 3d' then 'STL'
        when lower(trim(v_trabajo.area)) = 'corte láser' then 'DXF / SVG / PDF'
        else 'Ficha técnica'
      end,
    'entrada_disponible', v_tiene_entrada,
    'salida_requerida',
      case
        when lower(trim(v_trabajo.area)) = 'diseño 3d' then '3DM'
        else 'Sin archivo digital obligatorio'
      end,
    'salida_disponible', v_tiene_salida,
    'listo', v_ficha and v_tiene_entrada and case when lower(coalesce(_momento, 'enviar')) = 'completar' then v_tiene_salida else true end,
    'mensaje', v_mensaje
  );
end;
$$;

revoke all on function public.validar_requisitos_servicio_externo(uuid, text) from public, anon;
grant execute on function public.validar_requisitos_servicio_externo(uuid, text) to authenticated;

create or replace function public.asignar_participante_externo_trabajo(
  _trabajo_id uuid,
  _participante_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_trabajo public.trabajos;
  v_participante public.ecosistema_participantes;
  v_validacion jsonb;
begin
  if not public.es_admin(v_uid) then
    raise exception 'Solo un administrador puede asignar servicios externos';
  end if;

  select * into v_trabajo
  from public.trabajos
  where id = _trabajo_id
  for update;

  if v_trabajo.id is null then
    raise exception 'Trabajo no encontrado';
  end if;

  if not public.ve_sede(v_uid, v_trabajo.sede_id) then
    raise exception 'No tienes acceso al taller de este trabajo';
  end if;

  if _participante_id is not null then
    select * into v_participante
    from public.ecosistema_participantes
    where id = _participante_id
      and estado = 'activo';

    if v_participante.id is null then
      raise exception 'El servicio externo no existe o está inactivo';
    end if;

    if not exists (
      select 1
      from public.participante_especialidades pe
      join public.especialidades e on e.id = pe.especialidad_id
      where pe.participante_id = _participante_id
        and e.activa = true
        and lower(trim(e.nombre)) = lower(trim(v_trabajo.area))
    ) then
      raise exception 'El participante externo no tiene configurada la especialidad %', v_trabajo.area;
    end if;

    -- Impresión 3D y Corte Láser no pueden enviarse sin su archivo de entrada.
    select public.validar_requisitos_servicio_externo(_trabajo_id, 'enviar')
      into v_validacion;

    if coalesce((v_validacion->>'listo')::boolean, false) = false then
      raise exception '%', coalesce(v_validacion->>'mensaje', 'El servicio no cumple sus requisitos');
    end if;
  end if;

  update public.trabajos
  set participante_id = _participante_id,
      tipo = case when _participante_id is null then 'interno' else 'externo' end,
      responsable_user_id = null,
      updated_at = now()
  where id = _trabajo_id
  returning * into v_trabajo;

  -- Vincula al trabajo los archivos de entrada que correspondan a su servicio.
  if _participante_id is not null then
    insert into public.trabajo_archivos (trabajo_id, pedido_archivo_id)
    select v_trabajo.id, pa.id
    from public.pedido_archivos pa
    where pa.pedido_id = v_trabajo.pedido_id
      and pa.es_vigente_fabricacion = true
      and (
        (lower(trim(v_trabajo.area)) = 'impresión 3d'
          and lower(regexp_replace(pa.nombre, '^.*\\.', '')) = 'stl')
        or
        (lower(trim(v_trabajo.area)) = 'corte láser'
          and lower(regexp_replace(pa.nombre, '^.*\\.', '')) in ('dxf','svg','pdf'))
        or
        (lower(trim(v_trabajo.area)) = 'diseño 3d'
          and lower(pa.grupo) = 'diseño 3d')
      )
    on conflict (trabajo_id, pedido_archivo_id) do nothing;
  end if;

  return jsonb_build_object(
    'trabajo_id', v_trabajo.id,
    'tipo', v_trabajo.tipo,
    'participante_id', v_trabajo.participante_id,
    'responsable_user_id', v_trabajo.responsable_user_id
  );
end;
$$;

revoke all on function public.asignar_participante_externo_trabajo(uuid, uuid) from public, anon;
grant execute on function public.asignar_participante_externo_trabajo(uuid, uuid) to authenticated;

create or replace function public.cambiar_estado_trabajo(_trabajo_id uuid, _nuevo_estado text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_trabajo public.trabajos;
  v_validacion jsonb;
begin
  select t.* into v_trabajo
  from public.trabajos t
  where t.id = _trabajo_id
  for update;

  if v_trabajo.id is null then
    raise exception 'Trabajo no encontrado';
  end if;

  if _nuevo_estado not in ('pendiente','en_proceso','bloqueado','completado','cancelado') then
    raise exception 'Estado de trabajo no válido';
  end if;

  if v_trabajo.tipo = 'externo' then
    if not exists (
      select 1 from public.participante_cuentas pc
      where pc.user_id = v_uid
        and pc.participante_id = v_trabajo.participante_id
        and pc.estado = 'activo'
    ) then
      raise exception 'No tienes acceso al servicio externo';
    end if;

    if public.has_role(v_uid, 'gerente') or public.has_role(v_uid, 'dueno') then
      null;
    elsif v_trabajo.responsable_user_id = v_uid then
      null;
    else
      raise exception 'Debes tomar el trabajo antes de cambiar su estado';
    end if;

    if _nuevo_estado = 'completado' then
      select public.validar_requisitos_servicio_externo(_trabajo_id, 'completar')
        into v_validacion;
      if coalesce((v_validacion->>'listo')::boolean, false) = false then
        raise exception '%', coalesce(v_validacion->>'mensaje', 'El servicio no cumple sus requisitos de cierre');
      end if;
    end if;
  else
    if not (
      public.has_role(v_uid, 'dueno')
      or (
        public.has_role(v_uid, 'gerente')
        and public.ve_sede(v_uid, v_trabajo.sede_id)
      )
      or (
        v_trabajo.responsable_user_id = v_uid
        and public.ve_sede(v_uid, v_trabajo.sede_id)
      )
    ) then
      raise exception 'No tienes permiso para cambiar este trabajo';
    end if;
  end if;

  update public.trabajos
  set estado = _nuevo_estado,
      fecha_inicio = case
        when _nuevo_estado = 'en_proceso' and fecha_inicio is null then now()
        else fecha_inicio
      end,
      fecha_fin = case
        when _nuevo_estado in ('completado','cancelado') then now()
        when _nuevo_estado not in ('completado','cancelado') then null
        else fecha_fin
      end,
      updated_at = now()
  where id = _trabajo_id;
end;
$$;

revoke all on function public.cambiar_estado_trabajo(uuid, text) from public, anon;
grant execute on function public.cambiar_estado_trabajo(uuid, text) to authenticated;

create or replace function public.obtener_ficha_servicio_externo(_trabajo_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_trabajo public.trabajos;
  v_pedido public.pedidos;
  v_receptor uuid;
  v_requisitos jsonb;
begin
  if v_uid is null then
    raise exception 'Sesión no válida';
  end if;

  select t.* into v_trabajo
  from public.trabajos t
  where t.id = _trabajo_id
  for update;

  if v_trabajo.id is null or v_trabajo.tipo <> 'externo' then
    raise exception 'Servicio externo no encontrado';
  end if;

  select pc.participante_id into v_receptor
  from public.participante_cuentas pc
  where pc.user_id = v_uid
    and pc.participante_id = v_trabajo.participante_id
    and pc.estado = 'activo'
  limit 1;

  if v_receptor is null then
    raise exception 'No tienes acceso a este servicio externo';
  end if;

  select p.* into v_pedido
  from public.pedidos p
  where p.id = v_trabajo.pedido_id;

  if v_pedido.id is null then
    raise exception 'Pedido de origen no encontrado';
  end if;

  select public.validar_requisitos_servicio_externo(_trabajo_id, 'enviar')
    into v_requisitos;

  return jsonb_build_object(
    'trabajo', jsonb_build_object(
      'id', v_trabajo.id,
      'pedido_id', v_trabajo.pedido_id,
      'area', v_trabajo.area,
      'ubicacion', v_trabajo.ubicacion,
      'titulo', v_trabajo.titulo,
      'descripcion', v_trabajo.descripcion,
      'estado', v_trabajo.estado,
      'prioridad', v_trabajo.prioridad,
      'tipo', v_trabajo.tipo,
      'fecha_planificada', v_trabajo.fecha_planificada,
      'fecha_inicio', v_trabajo.fecha_inicio,
      'fecha_fin', v_trabajo.fecha_fin,
      'notas', v_trabajo.notas,
      'responsable_user_id', v_trabajo.responsable_user_id,
      'especialidad_id', v_trabajo.especialidad_id
    ),
    'pedido', jsonb_build_object(
      'id', v_pedido.id,
      'referencia', v_pedido.referencia,
      'pieza', v_pedido.pieza,
      'trabajo', v_pedido.trabajo,
      'material', v_pedido.material,
      'talla', v_pedido.talla,
      'piedras', v_pedido.piedras,
      'peso_estimado', v_pedido.peso_estimado,
      'cantidad_piezas', v_pedido.cantidad_piezas,
      'fecha_ingreso', v_pedido.fecha_ingreso,
      'fecha_entrega', v_pedido.fecha_entrega,
      'origen', v_pedido.origen,
      'area_actual', v_pedido.area_actual,
      'area_desde', v_pedido.area_desde,
      'notas', v_pedido.notas,
      'ruta', v_pedido.ruta,
      'corte_texto', v_pedido.corte_texto,
      'corte_tipografia', v_pedido.corte_tipografia,
      'corte_ubicacion', v_pedido.corte_ubicacion,
      'corte_observaciones', v_pedido.corte_observaciones
    ),
    'requisitos', v_requisitos,
    'materiales', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', pm.id,
          'cantidad_planificada', pm.cantidad_planificada,
          'unidad', pm.unidad,
          'notas', pm.notas,
          'material', i.material,
          'codigo', i.codigo,
          'inventario_unidad', i.unidad
        )
        order by pm.created_at
      )
      from public.pedido_materiales pm
      left join public.inventario i on i.id = pm.material_id
      where pm.pedido_id = v_pedido.id
    ), '[]'::jsonb),
    'archivos', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', pa.id,
          'nombre', pa.nombre,
          'tipo', pa.tipo,
          'url', pa.url,
          'es_enlace', pa.es_enlace,
          'grupo', pa.grupo,
          'version', pa.version,
          'es_vigente_fabricacion', pa.es_vigente_fabricacion
        )
        order by pa.created_at desc
      )
      from public.trabajo_archivos ta
      join public.pedido_archivos pa on pa.id = ta.pedido_archivo_id
      where ta.trabajo_id = v_trabajo.id
        and pa.es_vigente_fabricacion = true
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.obtener_ficha_servicio_externo(uuid) from public, anon;
grant execute on function public.obtener_ficha_servicio_externo(uuid) to authenticated;

-- Cualquier vía que convierta un trabajo en externo pasa por el mismo contrato.
-- Esto protege también la preparación automática por capacidad.
create or replace function public.validar_asignacion_documental_servicio_externo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $
declare
  v_validacion jsonb;
begin
  if new.tipo = 'externo'
     and (
       tg_op = 'INSERT'
       or old.tipo is distinct from new.tipo
       or old.participante_id is distinct from new.participante_id
     ) then
    select public.validar_requisitos_servicio_externo(new.id, 'enviar')
      into v_validacion;

    if coalesce((v_validacion->>'listo')::boolean, false) = false then
      raise exception '%', coalesce(v_validacion->>'mensaje', 'El servicio externo no cumple sus requisitos documentales');
    end if;
  end if;

  return new;
end;
$;

drop trigger if exists trg_validar_asignacion_documental_servicio_externo on public.trabajos;
create trigger trg_validar_asignacion_documental_servicio_externo
before insert or update of tipo, participante_id on public.trabajos
for each row
execute function public.validar_asignacion_documental_servicio_externo();

create or replace function public.vincular_archivos_entrada_servicio_externo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $
begin
  if new.tipo = 'externo' and new.participante_id is not null then
    insert into public.trabajo_archivos (trabajo_id, pedido_archivo_id)
    select new.id, pa.id
    from public.pedido_archivos pa
    where pa.pedido_id = new.pedido_id
      and pa.es_vigente_fabricacion = true
      and (
        (lower(trim(new.area)) = 'impresión 3d'
          and lower(regexp_replace(pa.nombre, '^.*\\.', '')) = 'stl')
        or
        (lower(trim(new.area)) = 'corte láser'
          and lower(regexp_replace(pa.nombre, '^.*\\.', '')) in ('dxf','svg','pdf'))
        or
        (lower(trim(new.area)) = 'diseño 3d'
          and lower(pa.grupo) = 'diseño 3d')
      )
    on conflict (trabajo_id, pedido_archivo_id) do nothing;
  end if;

  return new;
end;
$;

drop trigger if exists trg_vincular_archivos_entrada_servicio_externo on public.trabajos;
create trigger trg_vincular_archivos_entrada_servicio_externo
after insert or update of tipo, participante_id on public.trabajos
for each row
execute function public.vincular_archivos_entrada_servicio_externo();

create or replace function public.registrar_entrega_servicio_externo(
  _trabajo_id uuid,
  _nombre text,
  _url text,
  _tipo text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $
declare
  v_uid uuid := (select auth.uid());
  v_trabajo public.trabajos;
  v_archivo public.pedido_archivos;
  v_version integer;
begin
  select t.* into v_trabajo
  from public.trabajos t
  where t.id = _trabajo_id
    and t.tipo = 'externo'
    and lower(trim(t.area)) = 'diseño 3d';

  if v_trabajo.id is null then
    raise exception 'Solo se puede registrar una entrega 3DM de un servicio Diseño 3D';
  end if;

  if not exists (
    select 1
    from public.participante_cuentas pc
    where pc.user_id = v_uid
      and pc.participante_id = v_trabajo.participante_id
      and pc.estado = 'activo'
  ) then
    raise exception 'No tienes acceso a este servicio externo';
  end if;

  if lower(regexp_replace(_nombre, '^.*\\.', '')) <> '3dm'
     or lower(regexp_replace(_url, '^.*\\.', '')) <> '3dm' then
    raise exception 'La entrega de Diseño 3D debe ser un archivo 3DM';
  end if;

  if _url <> format('%s/servicios/%s/%s', v_trabajo.pedido_id, v_trabajo.id, regexp_replace(_url, '^.*/', '')) then
    raise exception 'La ruta del archivo no corresponde al servicio';
  end if;

  update public.pedido_archivos
  set es_vigente_fabricacion = false
  where pedido_id = v_trabajo.pedido_id
    and grupo = 'Diseño 3D'
    and es_vigente_fabricacion = true;

  select coalesce(max(pa.version), 0) + 1
    into v_version
  from public.pedido_archivos pa
  where pa.pedido_id = v_trabajo.pedido_id
    and pa.grupo = 'Diseño 3D';

  insert into public.pedido_archivos (
    pedido_id, nombre, tipo, url, es_enlace, grupo, version, es_vigente_fabricacion
  )
  values (
    v_trabajo.pedido_id,
    _nombre,
    coalesce(nullif(_tipo, ''), 'model/3dm'),
    _url,
    false,
    'Diseño 3D',
    v_version,
    true
  )
  returning * into v_archivo;

  insert into public.trabajo_archivos (trabajo_id, pedido_archivo_id)
  values (v_trabajo.id, v_archivo.id)
  on conflict (trabajo_id, pedido_archivo_id) do nothing;

  return jsonb_build_object(
    'trabajo_id', v_trabajo.id,
    'pedido_archivo_id', v_archivo.id,
    'nombre', v_archivo.nombre,
    'version', v_archivo.version
  );
end;
$;

revoke all on function public.registrar_entrega_servicio_externo(uuid, text, text, text) from public, anon;
grant execute on function public.registrar_entrega_servicio_externo(uuid, text, text, text) to authenticated;

-- El receptor también puede leer únicamente los archivos del servicio externo
-- que están bajo la carpeta específica de ese trabajo.
drop policy if exists "pedidos archivos leer servicio externo" on storage.objects;
create policy "pedidos archivos leer servicio externo"
on storage.objects for select to authenticated
using (
  bucket_id = 'pedidos'
  and (storage.foldername(name))[2] = 'servicios'
  and storage.extension(name) = '3dm'
  and exists (
    select 1
    from public.trabajos t
    join public.participante_cuentas pc
      on pc.participante_id = t.participante_id
     and pc.user_id = (select auth.uid())
     and pc.estado = 'activo'
    where t.tipo = 'externo'
      and t.area = 'Diseño 3D'
      and t.id = (nullif((storage.foldername(name))[3], ''))::uuid
      and t.pedido_id = (nullif((storage.foldername(name))[1], ''))::uuid
  )
);

-- Permite al receptor subir únicamente el entregable 3DM de un servicio Diseño 3D.
drop policy if exists "pedidos archivos subir autorizado" on storage.objects;
create policy "pedidos archivos subir autorizado"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'pedidos'
  and (
    exists (
      select 1 from public.pedidos p
      where p.id = (nullif(split_part(name, '/', 1), ''))::uuid
        and public.ve_sede((select auth.uid()), p.sede_id)
        and (
          public.es_admin((select auth.uid()))
          or public.has_role((select auth.uid()), 'monitor')
          or exists (
            select 1 from public.user_areas ua
            where ua.user_id = (select auth.uid())
              and lower(trim(ua.area)) = lower(trim(p.area_actual))
          )
          or exists (
            select 1
            from public.trabajos t
            where t.pedido_id = p.id
              and t.sede_id = p.sede_id
              and (
                t.responsable_user_id = (select auth.uid())
                or exists (
                  select 1
                  from public.user_areas ua
                  where ua.user_id = (select auth.uid())
                    and lower(trim(ua.area)) = lower(trim(t.area))
                )
              )
          )
        )
    )
    or
    (
      (storage.foldername(name))[2] = 'servicios'
      and (storage.foldername(name))[3] is not null
      and storage.extension(name) = '3dm'
      and exists (
        select 1
        from public.trabajos t
        join public.participante_cuentas pc
          on pc.participante_id = t.participante_id
         and pc.user_id = (select auth.uid())
         and pc.estado = 'activo'
        where t.tipo = 'externo'
          and t.area = 'Diseño 3D'
          and t.id = (nullif((storage.foldername(name))[3], ''))::uuid
          and t.pedido_id = (nullif((storage.foldername(name))[1], ''))::uuid
      )
    )
  )
);

notify pgrst, 'reload schema';

commit;
