-- AURUM LAB / Mi Nube
-- Control de cuotas de carpetas y almacenamiento en el propio backend de Storage.
-- Aplicar manualmente en el SQL Editor del proyecto Supabase administrado por Lovable.
-- No elimina ni modifica archivos existentes. -1 significa sin límite.

begin;

create or replace function public.aurum_validar_cuotas_mi_nube_storage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_participante_id text;
  v_usuario_id text;
  v_carpeta text;
  v_plan_id text;
  v_limite_bytes bigint;
  v_limite_carpetas integer;
  v_nuevo_bytes bigint;
  v_bytes_actuales bigint;
  v_carpetas_actuales bigint;
  v_carpeta_existe boolean;
  v_excluir_id uuid := null;
begin
  -- Esta protección solo afecta al bucket privado de Mi Nube.
  if new.bucket_id <> 'mi-nube' then
    return new;
  end if;

  -- Estructura esperada: participante_id/usuario_id/carpeta/archivo
  if pg_catalog.array_length(pg_catalog.string_to_array(new.name, '/'), 1) < 4 then
    raise exception 'Ruta no válida para Mi Nube. Guarda los archivos dentro de una carpeta del taller.'
      using errcode = '23514';
  end if;

  v_participante_id := pg_catalog.split_part(new.name, '/', 1);
  v_usuario_id := pg_catalog.split_part(new.name, '/', 2);
  v_carpeta := pg_catalog.split_part(new.name, '/', 3);

  if v_participante_id = '' or v_usuario_id = '' or v_carpeta = '' then
    raise exception 'No se pudo validar la ruta del archivo en Mi Nube.'
      using errcode = '23514';
  end if;

  -- Reemplazar un archivo existente no debe contarlo dos veces.
  if tg_op = 'UPDATE' then
    v_excluir_id := old.id;
  end if;

  -- Serializa escrituras del mismo taller para reducir carreras entre subidas simultáneas.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_participante_id, 0)
  );

  if coalesce(new.metadata->>'size', '') !~ '^[0-9]+$' then
    raise exception 'No se pudo verificar el tamaño del archivo. Inténtalo nuevamente.'
      using errcode = '23514';
  end if;
  v_nuevo_bytes := (new.metadata->>'size')::bigint;

  select
    count(distinct (pg_catalog.split_part(o.name, '/', 2), pg_catalog.split_part(o.name, '/', 3)))::bigint,
    coalesce(
      sum(
        case
          when coalesce(o.metadata->>'size', '') ~ '^[0-9]+$'
            then (o.metadata->>'size')::bigint
          else 0::bigint
        end
      ),
      0::bigint
    )
  into v_carpetas_actuales, v_bytes_actuales
  from storage.objects o
  where o.bucket_id = 'mi-nube'
    and pg_catalog.split_part(o.name, '/', 1) = v_participante_id
    and pg_catalog.array_length(pg_catalog.string_to_array(o.name, '/'), 1) >= 4
    and (v_excluir_id is null or o.id <> v_excluir_id);

  select exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'mi-nube'
      and pg_catalog.split_part(o.name, '/', 1) = v_participante_id
      and pg_catalog.split_part(o.name, '/', 2) = v_usuario_id
      and pg_catalog.split_part(o.name, '/', 3) = v_carpeta
      and pg_catalog.array_length(pg_catalog.string_to_array(o.name, '/'), 1) >= 4
      and (v_excluir_id is null or o.id <> v_excluir_id)
  )
  into v_carpeta_existe;

  select
    coalesce(ep.metadata->>'plan_comercial', 'emprendedor')
  into v_plan_id
  from public.ecosistema_participantes ep
  where ep.id::text = v_participante_id
    and ep.estado = 'activo';

  if not found then
    raise exception 'El taller no está activo o no se pudo identificar su plan comercial.'
      using errcode = '23514';
  end if;

  select q.almacenamiento_mib, q.carpetas_mi_nube_max
  into v_limite_bytes, v_limite_carpetas
  from public.aurum_plan_quotas q
  where q.plan_id = v_plan_id;

  if not found then
    raise exception 'No se encontraron las cuotas del plan. Contacta al administrador antes de subir archivos.'
      using errcode = '23514';
  end if;

  if v_limite_carpetas <> -1
     and v_carpetas_actuales + case when v_carpeta_existe then 0 else 1 end > v_limite_carpetas then
    raise exception 'Has alcanzado el límite de carpetas de Mi Nube. Puedes liberar una carpeta o consultar un plan con mayor capacidad.'
      using errcode = '23514';
  end if;

  if v_limite_bytes <> -1
     and v_bytes_actuales + v_nuevo_bytes > v_limite_bytes::bigint * 1024 * 1024 then
    raise exception 'Almacenamiento de Mi Nube lleno. Elimina archivos que ya no necesites o amplía la capacidad del plan.'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

drop trigger if exists aurum_validar_cuotas_mi_nube_storage on storage.objects;

create trigger aurum_validar_cuotas_mi_nube_storage
before insert or update
on storage.objects
for each row
execute function public.aurum_validar_cuotas_mi_nube_storage();

revoke all on function public.aurum_validar_cuotas_mi_nube_storage() from public, anon, authenticated;

comment on function public.aurum_validar_cuotas_mi_nube_storage() is
'Valida en backend las cuotas de almacenamiento y carpetas de Mi Nube antes de insertar o reemplazar objetos. Aplica a subidas normales y cargas administrativas.';

commit;
