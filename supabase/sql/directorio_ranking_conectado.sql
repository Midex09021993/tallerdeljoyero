-- Ranking y medallas reales del Directorio AURUM LAB.
-- EJECUCIÓN MANUAL por el propietario en Supabase SQL Editor.
-- No modifica registros de participantes ni productos existentes.

begin;

create table if not exists public.directorio_ranking_config (
  id boolean primary key default true check (id = true),
  peso_perfil integer not null default 30,
  peso_productos integer not null default 25,
  peso_actividad integer not null default 25,
  peso_verificacion integer not null default 20,
  nivel_bronce integer not null default 30,
  nivel_plata integer not null default 60,
  nivel_oro integer not null default 80,
  actividad_dias integer not null default 30,
  gracia_degradacion_dias integer not null default 7,
  diamantes_por_categoria integer not null default 3,
  actualizado_en timestamptz not null default now(),
  constraint directorio_ranking_pesos check (peso_perfil + peso_productos + peso_actividad + peso_verificacion = 100),
  constraint directorio_ranking_niveles check (nivel_bronce >= 0 and nivel_plata > nivel_bronce and nivel_oro > nivel_plata and nivel_oro <= 100)
);
insert into public.directorio_ranking_config(id) values(true) on conflict(id) do nothing;

create table if not exists public.directorio_ranking_verificaciones (
  participante_id uuid primary key references public.ecosistema_participantes(id) on delete cascade,
  verificado boolean not null default false,
  tipo_verificacion text,
  observaciones text,
  verificado_por uuid,
  verificado_en timestamptz,
  actualizado_en timestamptz not null default now(),
  constraint directorio_ranking_tipo_verificacion check (tipo_verificacion is null or tipo_verificacion in ('identidad','negocio','documentacion','manual','otro'))
);

create table if not exists public.directorio_ranking_historial (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.ecosistema_participantes(id) on delete cascade,
  puntuacion_total numeric(5,2) not null,
  nivel text not null check (nivel in ('none','bronze','silver','gold')),
  calculado_en timestamptz not null default now()
);
create index if not exists directorio_ranking_historial_participante_fecha_idx
  on public.directorio_ranking_historial(participante_id, calculado_en desc);
create index if not exists directorio_ranking_historial_fecha_idx
  on public.directorio_ranking_historial(calculado_en desc);

alter table public.directorio_ranking_config enable row level security;
alter table public.directorio_ranking_verificaciones enable row level security;
alter table public.directorio_ranking_historial enable row level security;
revoke all on public.directorio_ranking_config from anon, authenticated;
revoke all on public.directorio_ranking_verificaciones from anon, authenticated;
revoke all on public.directorio_ranking_historial from anon, authenticated;

create or replace function public.obtener_directorio_comunidad_publica_ranking()
returns table (
  tipo text, participante_id uuid, nombre text, descripcion text, imagen_url text, slug text,
  catalogo_visible boolean, formacion_titulo text, formacion_descripcion text,
  productos_publicados bigint, productos_destacados jsonb, identidad_nombre text,
  identidad_logo text, identidad_ciudad text, identidad_pais text, identidad_sitio_web text,
  ranking_score numeric, ranking_level text, ranking_diamond_position integer
)
language sql stable security definer set search_path=''
as $function$
  with base as (select * from public.obtener_directorio_comunidad_publica()),
  metricas as (
    select ep.id,
      (
        (case when nullif(btrim(coalesce(ep.nombre,'')), '') is not null then 1 else 0 end) +
        (case when nullif(btrim(coalesce(ep.descripcion,'')), '') is not null or nullif(btrim(coalesce(c.descripcion,'')), '') is not null then 1 else 0 end) +
        (case when nullif(btrim(coalesce(c.logo_url,'')), '') is not null or nullif(btrim(coalesce(ic.logo_url,'')), '') is not null then 1 else 0 end) +
        (case when nullif(btrim(coalesce(ic.ciudad,ep.ciudad,'')), '') is not null and nullif(btrim(coalesce(ic.pais_nombre,'')), '') is not null then 1 else 0 end) +
        (case when coalesce(nullif(btrim(coalesce(c.telefono_contacto,'')),''),nullif(btrim(coalesce(c.whatsapp,'')),''),nullif(btrim(coalesce(c.email_contacto,'')),''),nullif(btrim(coalesce(ic.telefono,'')),''),nullif(btrim(coalesce(ic.email,'')),''),nullif(btrim(coalesce(ic.sitio_web,'')),'')) is not null then 1 else 0 end)
      ) * 20.0 as perfil_score,
      least(100.0, count(distinct p.id)::numeric * 10) as productos_score,
      least(100.0, count(distinct a.id)::numeric * 10) as actividad_score,
      case when coalesce(v.verificado,false) then 100.0 else 0.0 end as verificacion_score
    from public.ecosistema_participantes ep
    left join public.catalogo_configuracion c on c.participante_id=ep.id
    left join public.identidades_comerciales ic on ic.participante_id=ep.id and ic.activa=true
    left join public.catalogo_productos p on p.participante_id=ep.id and p.publicado=true
    left join public.aurum_community_activity a on a.participante_id=ep.id and a.is_public=true
    left join public.directorio_ranking_verificaciones v on v.participante_id=ep.id
    cross join public.directorio_ranking_config cfg
    where ep.estado='activo' and coalesce(ep.comunidad_visible,true)
      and a.created_at >= now() - make_interval(days => cfg.actividad_dias)
    group by ep.id, ep.nombre, ep.descripcion, ep.ciudad, c.descripcion, c.logo_url, c.telefono_contacto, c.whatsapp, c.email_contacto, ic.logo_url, ic.ciudad, ic.pais_nombre, ic.telefono, ic.email, ic.sitio_web, v.verificado, cfg.actividad_dias
  ),
  puntuaciones as (
    select m.*,
      round((m.perfil_score*cfg.peso_perfil + m.productos_score*cfg.peso_productos + m.actividad_score*cfg.peso_actividad + m.verificacion_score*cfg.peso_verificacion)/100.0,2) as total,
      cfg.nivel_bronce, cfg.nivel_plata, cfg.nivel_oro, cfg.diamantes_por_categoria, cfg.gracia_degradacion_dias
    from metricas m cross join public.directorio_ranking_config cfg where cfg.id=true
  ),
  niveles_base as (
    select p.*,
      case when total>=nivel_oro then 'gold' when total>=nivel_plata then 'silver' when total>=nivel_bronce then 'bronze' else 'none' end as nivel_actual
    from puntuaciones p
  ),
  niveles as (
    select n.*,
      case
        when h.nivel in ('gold','silver','bronze') and
          case h.nivel when 'gold' then 3 when 'silver' then 2 when 'bronze' then 1 else 0 end >
          case n.nivel_actual when 'gold' then 3 when 'silver' then 2 when 'bronze' then 1 else 0 end
          and h.calculado_en >= now() - make_interval(days => n.gracia_degradacion_dias)
        then h.nivel else n.nivel_actual end as nivel
    from niveles_base n
    left join lateral (
      select nivel,calculado_en from public.directorio_ranking_historial h
      where h.participante_id=n.id order by h.calculado_en desc limit 1
    ) h on true
  ),
  ranks as (
    select n.*, row_number() over(partition by b.tipo order by n.total desc,n.id) as diamond_rank
    from niveles n join (select distinct tipo,participante_id from base) b on b.participante_id=n.id
  )
  select b.tipo,b.participante_id,b.nombre,b.descripcion,b.imagen_url,b.slug,b.catalogo_visible,b.formacion_titulo,b.formacion_descripcion,b.productos_publicados,b.productos_destacados,b.identidad_nombre,b.identidad_logo,b.identidad_ciudad,b.identidad_pais,b.identidad_sitio_web,
    r.total,
    case when r.diamond_rank<=r.diamantes_por_categoria and r.total>0 then 'diamond' else r.nivel end,
    case when r.diamond_rank<=r.diamantes_por_categoria and r.total>0 then r.diamond_rank::integer else null end
  from base b join ranks r on r.id=b.participante_id
  order by b.nombre,b.tipo;
$function$;

revoke all on function public.obtener_directorio_comunidad_publica_ranking() from public;
grant execute on function public.obtener_directorio_comunidad_publica_ranking() to anon, authenticated;

create or replace function public.directorio_ranking_registrar_snapshot()
returns integer
language plpgsql security definer set search_path=''
as $function$
declare v_count integer;
begin
  insert into public.directorio_ranking_historial(participante_id,puntuacion_total,nivel)
  select r.participante_id,r.ranking_score,r.ranking_level
  from public.obtener_directorio_comunidad_publica_ranking() r
  where r.ranking_level in ('none','bronze','silver','gold')
    and not exists(select 1 from public.directorio_ranking_historial h where h.participante_id=r.participante_id and h.calculado_en::date=current_date);
  get diagnostics v_count=row_count;
  return v_count;
end;
$function$;
revoke all on function public.directorio_ranking_registrar_snapshot() from public, anon, authenticated;
grant execute on function public.directorio_ranking_registrar_snapshot() to service_role;

-- Si pg_cron ya está instalado, deja snapshots diarios para el período de gracia.
do $schedule$
begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    if not exists(select 1 from cron.job where jobname='aurum-directorio-ranking-daily') then
      perform cron.schedule('aurum-directorio-ranking-daily','15 3 * * *','select public.directorio_ranking_registrar_snapshot();');
    end if;
  end if;
exception when undefined_table or undefined_function then
  raise notice 'pg_cron no está disponible: snapshots diarios deberán programarse manualmente.';
end
$schedule$;

comment on table public.directorio_ranking_config is 'Pesos y umbrales configurables del ranking público.';
comment on table public.directorio_ranking_verificaciones is 'Verificaciones manuales; escrituras sólo mediante rol de servicio.';
comment on table public.directorio_ranking_historial is 'Snapshots diarios para evolución y período de gracia de descenso.';
comment on function public.obtener_directorio_comunidad_publica_ranking() is 'RPC pública con score calculado por perfil, productos, actividad pública reciente y verificación.';

notify pgrst,'reload schema';
commit;

-- Verificación:
select * from public.obtener_directorio_comunidad_publica_ranking();
