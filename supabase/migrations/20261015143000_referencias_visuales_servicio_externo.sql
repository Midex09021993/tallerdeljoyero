-- Incluye las imágenes de referencia del pedido en la ficha del servicio externo.
-- Solo puede invocarla la cuenta del participante asignado al trabajo.
begin;

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
      from public.pedido_archivos pa
      where pa.pedido_id = v_pedido.id
        and (
          pa.es_vigente_fabricacion = true
          or lower(coalesce(pa.tipo, '')) like 'image/%'
          or lower(coalesce(pa.tipo, '') || ' ' || coalesce(pa.grupo, '')) ~ '(imagen|image|foto|fotografía|perspectiva)'
          or lower(pa.nombre) like any (array[
            '%.png', '%.jpg', '%.jpeg', '%.webp', '%.gif',
            '%.avif', '%.bmp', '%.svg'
          ])
        )
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.obtener_ficha_servicio_externo(uuid) from public, anon;
grant execute on function public.obtener_ficha_servicio_externo(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
