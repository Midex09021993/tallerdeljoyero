-- Cierre de rutas directas de autorizacion por sede.
-- Desde esta migracion, las excepciones conocidas tambien resuelven el taller
-- mediante participante_cuentas/ecosistema_participantes.
-- sedes_id permanece solo como dato de compatibilidad.

-- 1. Pedidos: gerente ya no depende de profiles.sede_id.
drop policy if exists "pedidos leer por alcance operativo" on public.pedidos;

create policy "pedidos leer por alcance operativo"
on public.pedidos
for select
to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
  or (
    public.ve_sede((select auth.uid()), sede_id)
    and (
      public.has_role((select auth.uid()), 'monitor'::public.app_role)
      or exists (
        select 1
        from public.trabajos t
        where t.pedido_id = pedidos.id
          and t.sede_id = pedidos.sede_id
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
);

-- 2. Eventos de inventario de joyas: autorización canónica.
drop policy if exists "joya_eventos_select_sede" on public.inventario_joya_eventos;

create policy "joya_eventos_select_sede"
on public.inventario_joya_eventos
for select
to authenticated
using (
  public.ve_sede((select auth.uid()), sede_id)
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.activo = true
  )
);

-- 3. Asignación de responsables: el responsable debe pertenecer al mismo
-- participante activo, no simplemente compartir sede_id.
create or replace function public.asignar_responsable_trabajo(
  _trabajo_id uuid,
  _responsable_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trabajo public.trabajos;
  v_responsable public.profiles;
  v_area_trabajo text;
  v_participante_id uuid;
begin
  if not public.es_admin((select auth.uid())) then
    raise exception 'Solo un administrador puede asignar responsables';
  end if;

  select *
  into v_trabajo
  from public.trabajos
  where id = _trabajo_id
  for update;

  if v_trabajo.id is null then
    raise exception 'Trabajo no encontrado';
  end if;

  if not public.ve_sede((select auth.uid()), v_trabajo.sede_id) then
    raise exception 'No tienes acceso al taller de este trabajo';
  end if;

  v_participante_id := v_trabajo.participante_id;

  if v_participante_id is null and v_trabajo.sede_id is not null then
    select ep.id
      into v_participante_id
    from public.ecosistema_participantes ep
    where ep.sede_id = v_trabajo.sede_id
      and ep.estado = 'activo'
    limit 1;
  end if;

  if _responsable_user_id is not null then
    select *
    into v_responsable
    from public.profiles
    where id = _responsable_user_id
      and activo = true;

    if v_responsable.id is null then
      raise exception 'El operario no existe o está inactivo';
    end if;

    if v_participante_id is null
       or not public.tiene_participante(_responsable_user_id, v_participante_id) then
      raise exception 'El operario no pertenece al taller';
    end if;

    if not public.has_role(_responsable_user_id, 'operario') then
      raise exception 'El responsable seleccionado no tiene rol de operario';
    end if;

    v_area_trabajo := lower(trim(v_trabajo.area));

    if v_area_trabajo = 'servicio láser'
       or v_area_trabajo = 'corte laser'
       or v_area_trabajo = 'corte láser' then
      v_area_trabajo := 'corte láser';
    elsif v_area_trabajo = 'taller / engaste'
       or v_area_trabajo = 'más alto'
       or v_area_trabajo = 'mas alto' then
      v_area_trabajo := 'taller';
    end if;

    if not exists (
      select 1
      from public.user_areas ua
      where ua.user_id = _responsable_user_id
        and (
          lower(trim(ua.area)) = v_area_trabajo
          or (
            v_area_trabajo = 'taller'
            and lower(trim(ua.area)) = 'taller / engaste'
          )
          or (
            v_area_trabajo = 'corte láser'
            and lower(trim(ua.area)) in ('servicio láser', 'corte laser', 'corte láser')
          )
        )
    ) then
      raise exception 'El operario no tiene asignada el área %', v_trabajo.area;
    end if;
  end if;

  update public.trabajos
  set responsable_user_id = _responsable_user_id,
      participante_id = v_participante_id,
      updated_at = now()
  where id = _trabajo_id
  returning * into v_trabajo;

  return jsonb_build_object(
    'trabajo_id', v_trabajo.id,
    'responsable_user_id', v_trabajo.responsable_user_id,
    'participante_id', v_trabajo.participante_id
  );
end;
$$;

revoke all on function public.asignar_responsable_trabajo(uuid, uuid) from public, anon;
grant execute on function public.asignar_responsable_trabajo(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';