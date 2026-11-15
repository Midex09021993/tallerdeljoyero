-- AURUM LAB: automatic community activity events.
-- Apply manually in Lovable Cloud / Supabase SQL Editor.
begin;

alter table public.aurum_community_activity
  add column if not exists participante_id uuid references public.ecosistema_participantes(id) on delete cascade,
  add column if not exists target_url text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists dedupe_key text;

alter table public.aurum_community_activity
  drop constraint if exists aurum_community_activity_type_check;
alter table public.aurum_community_activity
  drop constraint if exists aurum_community_activity_activity_type_check;
alter table public.aurum_community_activity
  add constraint aurum_community_activity_type_check
  check (activity_type in (
    'workshop_registered',
    'design_published',
    'profile_completed',
    'catalog_updated',
    'render_shared',
    'referral_registered',
    'publication','catalog','registration','render','achievement','milestone'
  ));

create unique index if not exists aurum_community_activity_dedupe_idx
  on public.aurum_community_activity(dedupe_key)
  where dedupe_key is not null;
create index if not exists aurum_community_activity_participant_created_idx
  on public.aurum_community_activity(participante_id, created_at desc)
  where is_public = true;

create or replace function public.aurum_emitir_actividad_comunidad(
  _participante_id uuid,
  _tipo text,
  _titulo text,
  _resumen text default null,
  _dedupe_key text default null,
  _target_url text default null,
  _metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre text;
  v_publico boolean;
begin
  select ep.nombre, coalesce(ep.comunidad_visible, true)
    into v_nombre, v_publico
  from public.ecosistema_participantes ep
  where ep.id = _participante_id
    and ep.estado = 'activo';

  if v_nombre is null then return; end if;

  insert into public.aurum_community_activity (
    participante_id, actor_name, activity_type, title, summary,
    target_url, metadata, dedupe_key, is_public, created_by
  )
  values (
    _participante_id, v_nombre, _tipo, _titulo, _resumen,
    _target_url, coalesce(_metadata, '{}'::jsonb), _dedupe_key,
    v_publico, auth.uid()
  )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
end;
$$;

revoke all on function public.aurum_emitir_actividad_comunidad(uuid,text,text,text,text,text,jsonb)
  from public, anon, authenticated;

create or replace function public.aurum_evento_taller_registrado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.tipo_participante = 'organizacion' then
    perform public.aurum_emitir_actividad_comunidad(
      new.id, 'workshop_registered', 'se ha unido a la comunidad AURUM LAB',
      'Un nuevo taller forma parte de la red profesional.',
      'workshop:' || new.id::text, null, jsonb_build_object('source','ecosistema_participantes')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists aurum_evento_taller_registrado_trg on public.ecosistema_participantes;
create trigger aurum_evento_taller_registrado_trg
after insert on public.ecosistema_participantes
for each row execute function public.aurum_evento_taller_registrado();

create or replace function public.aurum_evento_producto_comunidad()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.publicado is true and (tg_op = 'INSERT' or old.publicado is distinct from true) then
    perform public.aurum_emitir_actividad_comunidad(
      new.participante_id, 'design_published', 'publicó un nuevo diseño: ' || new.nombre,
      'Un nuevo diseño está disponible en su catálogo.',
      'design:' || new.id::text, '/' || coalesce((select c.slug from public.catalogo_configuracion c where c.participante_id = new.participante_id), ''),
      jsonb_build_object('producto_id', new.id)
    );
  end if;

  if new.publicado is true
     and nullif(btrim(coalesce(new.aurum_render_url, '')), '') is not null
     and (tg_op = 'INSERT' or old.aurum_render_url is distinct from new.aurum_render_url) then
    perform public.aurum_emitir_actividad_comunidad(
      new.participante_id, 'render_shared', 'compartió un nuevo render 3D',
      'Una visualización 3D se ha incorporado a su catálogo público.',
      'render:' || new.id::text || ':' || md5(new.aurum_render_url),
      '/' || coalesce((select c.slug from public.catalogo_configuracion c where c.participante_id = new.participante_id), ''),
      jsonb_build_object('producto_id', new.id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists aurum_evento_producto_comunidad_trg on public.catalogo_productos;
create trigger aurum_evento_producto_comunidad_trg
after insert or update of publicado, aurum_render_url on public.catalogo_productos
for each row execute function public.aurum_evento_producto_comunidad();

create or replace function public.aurum_evento_catalogo_actualizado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.visible is true and (
    old.visible is distinct from new.visible
    or old.nombre_publico is distinct from new.nombre_publico
    or old.descripcion is distinct from new.descripcion
    or old.logo_url is distinct from new.logo_url
  ) then
    perform public.aurum_emitir_actividad_comunidad(
      new.participante_id, 'catalog_updated', 'actualizó su catálogo digital',
      'La presentación pública de su taller ha sido actualizada.',
      'catalog:' || new.id::text || ':' || new.updated_at::text,
      '/' || new.slug,
      jsonb_build_object('catalog_slug', new.slug)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists aurum_evento_catalogo_actualizado_trg on public.catalogo_configuracion;
create trigger aurum_evento_catalogo_actualizado_trg
after update of visible, nombre_publico, descripcion, logo_url on public.catalogo_configuracion
for each row execute function public.aurum_evento_catalogo_actualizado();

create or replace function public.aurum_evento_perfil_completado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile jsonb := to_jsonb(new);
  v_participante uuid;
  v_campos integer := 0;
begin
  v_participante := nullif(v_profile->>'participante_id','')::uuid;
  if v_participante is null then return new; end if;

  select count(*) into v_campos
  from (values
    (nullif(btrim(coalesce(v_profile->>'nombre','')),'')),
    (nullif(btrim(coalesce(v_profile->>'telefono','')),'')),
    (nullif(btrim(coalesce(v_profile->>'email','')),'')),
    (nullif(btrim(coalesce(v_profile->>'avatar_url','')),'')),
    (nullif(btrim(coalesce(v_profile->>'ciudad','')),'')),
    (nullif(btrim(coalesce(v_profile->>'pais','')),'')),
    (nullif(btrim(coalesce(v_profile->>'especialidad','')),'')),
    (nullif(btrim(coalesce(v_profile->>'biografia','')),''))
  ) as campos(valor)
  where valor is not null;

  if v_campos >= 4 then
    perform public.aurum_emitir_actividad_comunidad(
      v_participante, 'profile_completed', 'completó su perfil profesional',
      'El perfil del taller ya cuenta con información profesional.',
      'profile-complete:' || v_participante::text, null,
      jsonb_build_object('completion_threshold', 4)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists aurum_evento_perfil_completado_trg on public.profiles;
create trigger aurum_evento_perfil_completado_trg
after insert or update on public.profiles
for each row execute function public.aurum_evento_perfil_completado();

-- La relación queda detectada como referido solo cuando la fila lo declara
-- explícitamente mediante relacion/origen/codigo_referido.
create or replace function public.aurum_evento_referido_registrado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(new);
  v_participante uuid;
  v_es_referido boolean;
begin
  v_participante := nullif(v_row->>'participante_id','')::uuid;
  v_es_referido :=
    lower(coalesce(v_row->>'relacion','')) like '%referid%'
    or lower(coalesce(v_row->>'origen','')) like '%referid%'
    or nullif(v_row->>'codigo_referido','') is not null;

  if v_participante is not null and v_es_referido then
    perform public.aurum_emitir_actividad_comunidad(
      v_participante, 'referral_registered', 'registró un nuevo referido',
      'Un nuevo contacto llegó mediante una recomendación.',
      'referral:' || coalesce(v_row->>'id', v_row->>'user_id', gen_random_uuid()::text),
      null, jsonb_build_object('source','participante_cuentas')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists aurum_evento_referido_registrado_trg on public.participante_cuentas;
create trigger aurum_evento_referido_registrado_trg
after insert on public.participante_cuentas
for each row execute function public.aurum_evento_referido_registrado();

create or replace function public.obtener_actividad_comunidad_por_slug(_slug text)
returns setof public.aurum_community_activity
language sql
stable
security definer
set search_path = ''
as $$
  select a.*
  from public.aurum_community_activity a
  join public.catalogo_configuracion c on c.participante_id = a.participante_id
  join public.ecosistema_participantes ep on ep.id = a.participante_id
  where lower(c.slug) = lower(btrim(_slug))
    and c.visible = true
    and ep.estado = 'activo'
    and coalesce(ep.comunidad_visible, true)
    and a.is_public = true
  order by a.created_at desc
  limit 30;
$$;

revoke all on function public.obtener_actividad_comunidad_por_slug(text) from public;
grant execute on function public.obtener_actividad_comunidad_por_slug(text) to anon, authenticated;

notify pgrst, 'reload schema';
commit;
