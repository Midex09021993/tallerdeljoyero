-- Catálogo de Joyas: modelo canónico por participante.
-- Fuente de verdad: ecosistema_participantes.id
-- No depende de sede_id para ownership, RLS ni publicación pública.

begin;

create table if not exists public.catalogo_configuracion (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.ecosistema_participantes(id) on delete cascade,
  slug text not null default '',
  nombre_publico text not null,
  descripcion text,
  logo_url text,
  whatsapp text,
  visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogo_configuracion_participante_uq unique (participante_id),
  constraint catalogo_configuracion_slug_uq unique (slug)
);

create table if not exists public.catalogo_colecciones (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.ecosistema_participantes(id) on delete cascade,
  nombre text not null,
  slug text not null default '',
  descripcion text,
  orden integer not null default 0,
  publicado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogo_colecciones_participante_slug_uq unique (participante_id, slug)
);

create table if not exists public.catalogo_productos (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.ecosistema_participantes(id) on delete cascade,
  codigo text not null,
  nombre text not null,
  slug text not null default '',
  categoria text not null default 'Sin categoría',
  descripcion text,
  imagen_principal_url text,
  galeria jsonb not null default '[]'::jsonb,
  video_url text,
  aurum_render_url text,
  precio_desde numeric(12,2),
  moneda text not null default 'PEN',
  publicado boolean not null default false,
  destacado boolean not null default false,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogo_productos_participante_codigo_uq unique (participante_id, codigo),
  constraint catalogo_productos_participante_slug_uq unique (participante_id, slug),
  constraint catalogo_productos_precio_chk check (precio_desde is null or precio_desde >= 0),
  constraint catalogo_productos_galeria_chk check (jsonb_typeof(galeria) = 'array')
);

create table if not exists public.catalogo_productos_colecciones (
  producto_id uuid not null references public.catalogo_productos(id) on delete cascade,
  coleccion_id uuid not null references public.catalogo_colecciones(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (producto_id, coleccion_id)
);

-- Compatibilidad con una instalación antigua que hubiera creado sede_id.
DO $$
DECLARE v_missing integer;
BEGIN
  alter table public.catalogo_configuracion add column if not exists participante_id uuid;
  alter table public.catalogo_configuracion add column if not exists descripcion text;
  alter table public.catalogo_configuracion add column if not exists slug text;
  alter table public.catalogo_configuracion add column if not exists visible boolean not null default false;
  alter table public.catalogo_configuracion add column if not exists created_at timestamptz not null default now();
  alter table public.catalogo_configuracion add column if not exists updated_at timestamptz not null default now();
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='catalogo_configuracion' and column_name='sede_id') then
    update public.catalogo_configuracion c set participante_id=ep.id from public.ecosistema_participantes ep where c.participante_id is null and c.sede_id=ep.sede_id;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='catalogo_configuracion' and column_name='descripcion_publica') then
    update public.catalogo_configuracion set descripcion=coalesce(descripcion,descripcion_publica);
  end if;

  alter table public.catalogo_colecciones add column if not exists participante_id uuid;
  alter table public.catalogo_colecciones add column if not exists publicado boolean not null default false;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='catalogo_colecciones' and column_name='sede_id') then
    update public.catalogo_colecciones c set participante_id=ep.id from public.ecosistema_participantes ep where c.participante_id is null and c.sede_id=ep.sede_id;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='catalogo_colecciones' and column_name='estado') then
    update public.catalogo_colecciones set publicado=(estado='publicado');
  end if;

  alter table public.catalogo_productos add column if not exists participante_id uuid;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='catalogo_productos' and column_name='sede_id') then
    update public.catalogo_productos p set participante_id=ep.id from public.ecosistema_participantes ep where p.participante_id is null and p.sede_id=ep.sede_id;
  end if;

  select count(*) into v_missing from (
    select id from public.catalogo_configuracion where participante_id is null
    union all select id from public.catalogo_colecciones where participante_id is null
    union all select id from public.catalogo_productos where participante_id is null
  ) x;
  if v_missing > 0 then raise exception 'CATALOGO_INCONSISTENTE: existen % registros sin participante_id',v_missing; end if;
END $$;

create or replace function public.catalogo_normalizar_slug(_value text)
returns text language sql immutable set search_path='' as $$
  select left(regexp_replace(regexp_replace(lower(btrim(coalesce(_value,''))),'[^a-z0-9]+','-','g'),'(^-+|-+$)','','g'),80);
$$;

create or replace function public.catalogo_validar_slug_configuracion()
returns trigger language plpgsql set search_path='' as $$
declare v_slug text;
begin
  v_slug:=public.catalogo_normalizar_slug(coalesce(nullif(btrim(new.slug),''),new.nombre_publico));
  if v_slug='' then raise exception 'El slug del catálogo no puede quedar vacío'; end if;
  if v_slug in ('auth','inicio','transfer','joya','c','api','catalogo','catalogo-publico','pedidos','pedidos-2','cotizaciones','gestion','operario','taller','herramientas','perfil','aurum-render','aurum-render-public','lovable') then raise exception 'El slug % está reservado',v_slug; end if;
  new.slug:=v_slug; return new;
end; $$;

create or replace function public.catalogo_validar_slug_modelo()
returns trigger language plpgsql set search_path='' as $$
declare v_slug text;
begin
  v_slug:=public.catalogo_normalizar_slug(coalesce(nullif(btrim(new.slug),''),new.nombre));
  if v_slug='' then raise exception 'El slug no puede quedar vacío'; end if;
  new.slug:=v_slug; return new;
end; $$;

drop trigger if exists catalogo_configuracion_slug_trg on public.catalogo_configuracion;
create trigger catalogo_configuracion_slug_trg before insert or update of slug,nombre_publico on public.catalogo_configuracion for each row execute function public.catalogo_validar_slug_configuracion();
drop trigger if exists catalogo_colecciones_slug_trg on public.catalogo_colecciones;
create trigger catalogo_colecciones_slug_trg before insert or update of slug,nombre on public.catalogo_colecciones for each row execute function public.catalogo_validar_slug_modelo();
drop trigger if exists catalogo_productos_slug_trg on public.catalogo_productos;
create trigger catalogo_productos_slug_trg before insert or update of slug,nombre on public.catalogo_productos for each row execute function public.catalogo_validar_slug_modelo();
drop trigger if exists catalogo_configuracion_updated_at on public.catalogo_configuracion;
create trigger catalogo_configuracion_updated_at before update on public.catalogo_configuracion for each row execute function public.set_updated_at();
drop trigger if exists catalogo_colecciones_updated_at on public.catalogo_colecciones;
create trigger catalogo_colecciones_updated_at before update on public.catalogo_colecciones for each row execute function public.set_updated_at();
drop trigger if exists catalogo_productos_updated_at on public.catalogo_productos;
create trigger catalogo_productos_updated_at before update on public.catalogo_productos for each row execute function public.set_updated_at();

drop policy if exists "catalogo_colecciones_admin_select" on public.catalogo_colecciones;
drop policy if exists "catalogo_colecciones_admin_write" on public.catalogo_colecciones;
drop policy if exists "catalogo_productos_admin_select" on public.catalogo_productos;
drop policy if exists "catalogo_productos_admin_write" on public.catalogo_productos;
drop policy if exists "catalogo_relaciones_admin" on public.catalogo_productos_colecciones;
drop policy if exists "catalogo_config_admin" on public.catalogo_configuracion;
drop trigger if exists trg_catalogo_colecciones_participante_canonico on public.catalogo_colecciones;
drop trigger if exists trg_catalogo_productos_participante_canonico on public.catalogo_productos;
drop trigger if exists trg_catalogo_configuracion_participante_canonico on public.catalogo_configuracion;

DO $$
BEGIN
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='catalogo_configuracion' and column_name='sede_id') then alter table public.catalogo_configuracion drop column sede_id cascade; end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='catalogo_colecciones' and column_name='sede_id') then alter table public.catalogo_colecciones drop column sede_id cascade; end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='catalogo_productos' and column_name='sede_id') then alter table public.catalogo_productos drop column sede_id cascade; end if;
END $$;

alter table public.catalogo_configuracion alter column participante_id set not null;
alter table public.catalogo_colecciones alter column participante_id set not null;
alter table public.catalogo_productos alter column participante_id set not null;
alter table public.catalogo_configuracion alter column slug set not null;
alter table public.catalogo_colecciones alter column slug set not null;
alter table public.catalogo_productos alter column slug set not null;

DO $$
BEGIN
  if not exists (select 1 from pg_constraint where conname='catalogo_configuracion_participante_fkey') then alter table public.catalogo_configuracion add constraint catalogo_configuracion_participante_fkey foreign key(participante_id) references public.ecosistema_participantes(id) on delete cascade; end if;
  if not exists (select 1 from pg_constraint where conname='catalogo_colecciones_participante_fkey') then alter table public.catalogo_colecciones add constraint catalogo_colecciones_participante_fkey foreign key(participante_id) references public.ecosistema_participantes(id) on delete cascade; end if;
  if not exists (select 1 from pg_constraint where conname='catalogo_productos_participante_fkey') then alter table public.catalogo_productos add constraint catalogo_productos_participante_fkey foreign key(participante_id) references public.ecosistema_participantes(id) on delete cascade; end if;
END $$;

create unique index if not exists catalogo_configuracion_participante_uidx on public.catalogo_configuracion(participante_id);
create unique index if not exists catalogo_configuracion_slug_uidx on public.catalogo_configuracion(lower(slug));
create unique index if not exists catalogo_colecciones_participante_slug_uidx on public.catalogo_colecciones(participante_id,lower(slug));
create unique index if not exists catalogo_productos_participante_codigo_uidx on public.catalogo_productos(participante_id,lower(trim(codigo)));
create unique index if not exists catalogo_productos_participante_slug_uidx on public.catalogo_productos(participante_id,lower(slug));
create index if not exists catalogo_productos_participante_publicado_orden_idx on public.catalogo_productos(participante_id,publicado,orden);
create index if not exists catalogo_colecciones_participante_orden_idx on public.catalogo_colecciones(participante_id,orden);

create or replace function public.catalogo_validar_participante_relacion()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if not exists (select 1 from public.catalogo_productos p join public.catalogo_colecciones c on c.id=new.coleccion_id where p.id=new.producto_id and p.participante_id=c.participante_id) then raise exception 'El producto y la colección deben pertenecer al mismo participante'; end if;
  return new;
end; $$;
drop trigger if exists catalogo_validar_participante_relacion_trg on public.catalogo_productos_colecciones;
create trigger catalogo_validar_participante_relacion_trg before insert or update on public.catalogo_productos_colecciones for each row execute function public.catalogo_validar_participante_relacion();

alter table public.catalogo_configuracion enable row level security;
alter table public.catalogo_colecciones enable row level security;
alter table public.catalogo_productos enable row level security;
alter table public.catalogo_productos_colecciones enable row level security;

create policy "catalogo_configuracion_select_interno" on public.catalogo_configuracion for select to authenticated using(public.tiene_participante((select auth.uid()),participante_id));
create policy "catalogo_configuracion_admin_write" on public.catalogo_configuracion for all to authenticated using((
    public.has_role((select auth.uid()), 'dueno'::app_role)
    or (
      public.has_role((select auth.uid()), 'gerente'::app_role)
      and public.tiene_participante((select auth.uid()),participante_id)
    )
  )) with check((
    public.has_role((select auth.uid()), 'dueno'::app_role)
    or (
      public.has_role((select auth.uid()), 'gerente'::app_role)
      and public.tiene_participante((select auth.uid()),participante_id)
    )
  ));
create policy "catalogo_colecciones_select_interno" on public.catalogo_colecciones for select to authenticated using(public.tiene_participante((select auth.uid()),participante_id));
create policy "catalogo_colecciones_admin_write" on public.catalogo_colecciones for all to authenticated using((
    public.has_role((select auth.uid()), 'dueno'::app_role)
    or (
      public.has_role((select auth.uid()), 'gerente'::app_role)
      and public.tiene_participante((select auth.uid()),participante_id)
    )
  )) with check((
    public.has_role((select auth.uid()), 'dueno'::app_role)
    or (
      public.has_role((select auth.uid()), 'gerente'::app_role)
      and public.tiene_participante((select auth.uid()),participante_id)
    )
  ));
create policy "catalogo_productos_select_interno" on public.catalogo_productos for select to authenticated using(public.tiene_participante((select auth.uid()),participante_id));
create policy "catalogo_productos_admin_write" on public.catalogo_productos for all to authenticated using((
    public.has_role((select auth.uid()), 'dueno'::app_role)
    or (
      public.has_role((select auth.uid()), 'gerente'::app_role)
      and public.tiene_participante((select auth.uid()),participante_id)
    )
  )) with check((
    public.has_role((select auth.uid()), 'dueno'::app_role)
    or (
      public.has_role((select auth.uid()), 'gerente'::app_role)
      and public.tiene_participante((select auth.uid()),participante_id)
    )
  ));
create policy "catalogo_relaciones_select_interno" on public.catalogo_productos_colecciones for select to authenticated using(exists(select 1 from public.catalogo_productos p where p.id=producto_id and public.tiene_participante((select auth.uid()),p.participante_id)));
create policy "catalogo_relaciones_admin_write" on public.catalogo_productos_colecciones for all to authenticated using(exists(select 1 from public.catalogo_productos p where p.id=producto_id and (
        public.has_role((select auth.uid()), 'dueno'::app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::app_role)
          and public.tiene_participante((select auth.uid()),p.participante_id)
        )
      ))) with check(exists(select 1 from public.catalogo_productos p where p.id=producto_id and (
        public.has_role((select auth.uid()), 'dueno'::app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::app_role)
          and public.tiene_participante((select auth.uid()),p.participante_id)
        )
      )));

revoke all on public.catalogo_configuracion,public.catalogo_colecciones,public.catalogo_productos,public.catalogo_productos_colecciones from anon;
grant select,insert,update,delete on public.catalogo_configuracion,public.catalogo_colecciones,public.catalogo_productos,public.catalogo_productos_colecciones to authenticated;
grant all on public.catalogo_configuracion,public.catalogo_colecciones,public.catalogo_productos,public.catalogo_productos_colecciones to service_role;

drop function if exists public.obtener_catalogo_publico(text);
create function public.obtener_catalogo_publico(_slug text)
returns table(slug text,nombre_publico text,descripcion_publica text,logo_url text,whatsapp text,producto_id uuid,codigo text,nombre text,categoria text,descripcion_producto text,imagen_principal_url text,galeria jsonb,video_url text,aurum_render_url text,precio_desde numeric,moneda text,destacado boolean)
language sql stable security definer set search_path='' as $$
  select c.slug,c.nombre_publico,c.descripcion,c.logo_url,c.whatsapp,p.id,p.codigo,p.nombre,p.categoria,p.descripcion,p.imagen_principal_url,p.galeria,p.video_url,p.aurum_render_url,p.precio_desde,p.moneda,p.destacado
  from public.catalogo_configuracion c left join public.catalogo_productos p on p.participante_id=c.participante_id and p.publicado=true
  where lower(trim(c.slug))=lower(trim(_slug)) and c.visible=true
  order by p.destacado desc nulls last,p.orden nulls last,p.nombre nulls last;
$$;
revoke all on function public.obtener_catalogo_publico(text) from public,anon,authenticated;
grant execute on function public.obtener_catalogo_publico(text) to anon,authenticated;

notify pgrst,'reload schema';
commit;