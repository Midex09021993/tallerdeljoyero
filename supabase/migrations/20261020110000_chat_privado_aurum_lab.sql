begin;

create table if not exists public.chat_conversaciones (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'directa' check (tipo = 'directa'),
  clave_directa text not null unique,
  creado_por uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_conversacion_miembros (
  conversacion_id uuid not null references public.chat_conversaciones(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ultimo_leido_at timestamptz,
  unido_at timestamptz not null default now(),
  primary key (conversacion_id, user_id)
);

create table if not exists public.chat_mensajes (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.chat_conversaciones(id) on delete cascade,
  remitente_id uuid not null references auth.users(id) on delete cascade,
  contenido text not null check (char_length(btrim(contenido)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists chat_mensajes_conversacion_fecha_idx
  on public.chat_mensajes(conversacion_id, created_at desc);
create index if not exists chat_mensajes_no_leidos_idx
  on public.chat_mensajes(conversacion_id, created_at, remitente_id);

alter table public.chat_conversaciones enable row level security;
alter table public.chat_conversacion_miembros enable row level security;
alter table public.chat_mensajes enable row level security;

revoke all on public.chat_conversaciones from anon, public;
revoke all on public.chat_conversacion_miembros from anon, public;
revoke all on public.chat_mensajes from anon, public;
grant select on public.chat_conversaciones to authenticated;
grant select on public.chat_conversacion_miembros to authenticated;
revoke update on public.chat_conversacion_miembros from authenticated;
grant update (ultimo_leido_at) on public.chat_conversacion_miembros to authenticated;
grant select, insert on public.chat_mensajes to authenticated;

drop policy if exists chat_conversaciones_leer_miembro on public.chat_conversaciones;
create policy chat_conversaciones_leer_miembro on public.chat_conversaciones
for select to authenticated
using (exists (
  select 1 from public.chat_conversacion_miembros m
  where m.conversacion_id = chat_conversaciones.id and m.user_id = (select auth.uid())
));

drop policy if exists chat_miembros_leer_misma_conversacion on public.chat_conversacion_miembros;
create policy chat_miembros_leer_misma_conversacion on public.chat_conversacion_miembros
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists chat_miembros_actualizar_lectura_propia on public.chat_conversacion_miembros;
create policy chat_miembros_actualizar_lectura_propia on public.chat_conversacion_miembros
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists chat_mensajes_leer_miembro on public.chat_mensajes;
create policy chat_mensajes_leer_miembro on public.chat_mensajes
for select to authenticated
using (exists (
  select 1 from public.chat_conversacion_miembros m
  where m.conversacion_id = chat_mensajes.conversacion_id
    and m.user_id = (select auth.uid())
));

drop policy if exists chat_mensajes_enviar_como_remitente on public.chat_mensajes;
create policy chat_mensajes_enviar_como_remitente on public.chat_mensajes
for insert to authenticated
with check (
  remitente_id = (select auth.uid())
  and char_length(btrim(contenido)) between 1 and 4000
  and exists (
    select 1 from public.chat_conversacion_miembros m
    where m.conversacion_id = chat_mensajes.conversacion_id
      and m.user_id = (select auth.uid())
  )
);

-- El directorio sólo expone cuentas vinculadas a participantes activos y con rol operativo.
create or replace function public.chat_listar_participantes_activos()
returns table (
  user_id uuid,
  nombre_persona text,
  nombre_taller text,
  rol text
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (u.id)
    u.id,
    coalesce(nullif(trim(concat_ws(' ', p.nombre, p.apellidos)), ''), nullif(p.usuario, ''), 'Usuario') as nombre_persona,
    ep.nombre as nombre_taller,
    ur.role::text as rol
  from auth.users u
  join public.participante_cuentas pc on pc.user_id = u.id and pc.estado = 'activo'
  join public.ecosistema_participantes ep on ep.id = pc.participante_id and ep.estado = 'activo'
  join public.user_roles ur on ur.user_id = u.id
  left join public.profiles p on p.id = u.id
  where auth.uid() is not null
    and u.id <> auth.uid()
  order by u.id,
    case ur.role::text
      when 'dueno' then 1 when 'gerente' then 2 when 'operario' then 3
      when 'monitor' then 4 when 'cliente' then 5 else 6
    end,
    ep.nombre;
$$;

revoke all on function public.chat_listar_participantes_activos() from public, anon;
grant execute on function public.chat_listar_participantes_activos() to authenticated;

-- La RPC valida a ambos usuarios en el servidor y crea una conversación directa idempotente.
create or replace function public.chat_abrir_conversacion_directa(_otro_usuario_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_clave text;
  v_conversacion_id uuid;
begin
  if v_uid is null then
    raise exception using errcode = '28000', message = 'Debes iniciar sesión.';
  end if;
  if _otro_usuario_id is null or _otro_usuario_id = v_uid then
    raise exception using errcode = '22023', message = 'Selecciona otra persona.';
  end if;

  if not exists (
    select 1
    from public.participante_cuentas pc
    join public.ecosistema_participantes ep on ep.id = pc.participante_id
    join public.user_roles ur on ur.user_id = pc.user_id
    where pc.user_id = v_uid and pc.estado = 'activo' and ep.estado = 'activo'
  ) then
    raise exception using errcode = '42501', message = 'Tu cuenta no pertenece a un participante activo.';
  end if;

  if not exists (
    select 1
    from public.participante_cuentas pc
    join public.ecosistema_participantes ep on ep.id = pc.participante_id
    join public.user_roles ur on ur.user_id = pc.user_id
    where pc.user_id = _otro_usuario_id and pc.estado = 'activo' and ep.estado = 'activo'
  ) then
    raise exception using errcode = '42501', message = 'La persona seleccionada ya no pertenece al ecosistema activo.';
  end if;

  v_clave := least(v_uid::text, _otro_usuario_id::text) || ':' || greatest(v_uid::text, _otro_usuario_id::text);

  insert into public.chat_conversaciones (clave_directa, creado_por)
  values (v_clave, v_uid)
  on conflict (clave_directa) do update set updated_at = now()
  returning id into v_conversacion_id;

  insert into public.chat_conversacion_miembros (conversacion_id, user_id)
  values (v_conversacion_id, v_uid), (v_conversacion_id, _otro_usuario_id)
  on conflict (conversacion_id, user_id) do nothing;

  return v_conversacion_id;
end;
$$;

revoke all on function public.chat_abrir_conversacion_directa(uuid) from public, anon;
grant execute on function public.chat_abrir_conversacion_directa(uuid) to authenticated;

-- Sólo la membresía propia puede modificarse: el cliente únicamente cambia el marcador de lectura.
drop policy if exists chat_miembros_actualizar_lectura_propia on public.chat_conversacion_miembros;
create policy chat_miembros_actualizar_lectura_propia on public.chat_conversacion_miembros
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Realtime necesita que mensajes esté en la publicación de cambios; hacerlo condicional evita fallar si ya está añadida.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public' and tablename = 'chat_mensajes'
     ) then
    alter publication supabase_realtime add table public.chat_mensajes;
  end if;
end $$;


create or replace function public.chat_resumen_conversaciones()
returns table (
  conversacion_id uuid,
  otro_usuario_id uuid,
  nombre_persona text,
  nombre_taller text,
  rol text,
  ultimo_mensaje text,
  ultima_actividad timestamptz,
  no_leidos bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    conv.id,
    otro.user_id,
    coalesce(nullif(trim(concat_ws(' ', perfil.nombre, perfil.apellidos)), ''), nullif(perfil.usuario, ''), 'Usuario'),
    identidad.nombre_taller,
    identidad.rol,
    ultimo.contenido,
    coalesce(ultimo.created_at, conv.updated_at, conv.created_at),
    (select count(*) from public.chat_mensajes m
      where m.conversacion_id = conv.id
        and m.remitente_id <> auth.uid()
        and m.created_at > coalesce(mio.ultimo_leido_at, 'epoch'::timestamptz))
  from public.chat_conversaciones conv
  join public.chat_conversacion_miembros mio
    on mio.conversacion_id = conv.id and mio.user_id = auth.uid()
  join public.chat_conversacion_miembros otro
    on otro.conversacion_id = conv.id and otro.user_id <> auth.uid()
  join auth.users u on u.id = otro.user_id
  left join public.profiles perfil on perfil.id = otro.user_id
  left join lateral (
    select ep.nombre as nombre_taller, ur.role::text as rol
    from public.participante_cuentas pc
    join public.ecosistema_participantes ep on ep.id = pc.participante_id and ep.estado = 'activo'
    join public.user_roles ur on ur.user_id = pc.user_id
    where pc.user_id = otro.user_id and pc.estado = 'activo'
    order by case ur.role::text
      when 'dueno' then 1 when 'gerente' then 2 when 'operario' then 3
      when 'monitor' then 4 when 'cliente' then 5 else 6 end, ep.nombre
    limit 1
  ) identidad on true
  left join lateral (
    select m.contenido, m.created_at
    from public.chat_mensajes m
    where m.conversacion_id = conv.id
    order by m.created_at desc
    limit 1
  ) ultimo on true
  where auth.uid() is not null
  order by coalesce(ultimo.created_at, conv.updated_at, conv.created_at) desc;
$$;
revoke all on function public.chat_resumen_conversaciones() from public, anon;
grant execute on function public.chat_resumen_conversaciones() to authenticated;


-- Presencia en línea: canal privado, sólo cuentas activas del ecosistema.
drop policy if exists chat_presence_aurum_read on realtime.messages;
create policy chat_presence_aurum_read on realtime.messages
for select to authenticated
using (
  (select realtime.topic()) = 'aurum-lab-presence'
  and extension = 'presence'
  and exists (
    select 1
    from public.participante_cuentas pc
    join public.ecosistema_participantes ep on ep.id = pc.participante_id
    join public.user_roles ur on ur.user_id = pc.user_id
    where pc.user_id = (select auth.uid())
      and pc.estado = 'activo'
      and ep.estado = 'activo'
  )
);

drop policy if exists chat_presence_aurum_write on realtime.messages;
create policy chat_presence_aurum_write on realtime.messages
for insert to authenticated
with check (
  (select realtime.topic()) = 'aurum-lab-presence'
  and extension = 'presence'
  and exists (
    select 1
    from public.participante_cuentas pc
    join public.ecosistema_participantes ep on ep.id = pc.participante_id
    join public.user_roles ur on ur.user_id = pc.user_id
    where pc.user_id = (select auth.uid())
      and pc.estado = 'activo'
      and ep.estado = 'activo'
  )
);

commit;
