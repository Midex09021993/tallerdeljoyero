create table if not exists public.trabajos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  proyecto_joya_id uuid references public.proyectos_joya(id) on delete set null,
  sede_id uuid references public.sedes(id) on delete set null,
  secuencia integer not null default 1 check (secuencia > 0),
  tipo text not null default 'interno' check (tipo in ('interno','externo')),
  area text not null,
  ubicacion text not null default '',
  titulo text not null,
  descripcion text not null default '',
  estado text not null default 'pendiente' check (estado in ('pendiente','en_proceso','bloqueado','completado','cancelado')),
  prioridad text not null default 'normal' check (prioridad in ('baja','normal','alta','urgente')),
  responsable_user_id uuid references auth.users(id) on delete set null,
  participante_id uuid references public.ecosistema_participantes(id) on delete set null,
  fecha_planificada date,
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  notas text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trabajos_responsable_check check (
    responsable_user_id is not null or participante_id is not null or tipo = 'interno'
  ),
  constraint trabajos_tipo_participante_check check (
    tipo <> 'externo' or participante_id is not null
  )
);

create index if not exists trabajos_pedido_id_idx on public.trabajos(pedido_id);
create index if not exists trabajos_proyecto_joya_id_idx on public.trabajos(proyecto_joya_id);
create index if not exists trabajos_sede_id_idx on public.trabajos(sede_id);
create index if not exists trabajos_estado_idx on public.trabajos(estado);
create index if not exists trabajos_responsable_user_id_idx on public.trabajos(responsable_user_id);
create index if not exists trabajos_participante_id_idx on public.trabajos(participante_id);
create index if not exists trabajos_fecha_planificada_idx on public.trabajos(fecha_planificada);

create or replace function public.trabajos_set_updated_at()
returns trigger language plpgsql set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trabajos_set_updated_at on public.trabajos;
create trigger trabajos_set_updated_at
before update on public.trabajos
for each row execute function public.trabajos_set_updated_at();

alter table public.trabajos enable row level security;

drop policy if exists trabajos_select on public.trabajos;
create policy trabajos_select on public.trabajos
for select to authenticated
using (
  public.es_admin((select auth.uid()))
  or (
    sede_id is not null
    and public.mi_sede((select auth.uid())) = sede_id
    and (
      responsable_user_id = (select auth.uid())
      or exists (
        select 1 from public.participante_cuentas pc
        where pc.participante_id = trabajos.participante_id
          and pc.user_id = (select auth.uid())
          and pc.estado = 'activo'
      )
      or exists (
        select 1 from public.user_areas ua
        where ua.user_id = (select auth.uid())
          and lower(trim(ua.area)) = lower(trim(trabajos.area))
      )
    )
  )
);

drop policy if exists trabajos_insert on public.trabajos;
create policy trabajos_insert on public.trabajos
for insert to authenticated
with check (public.es_admin((select auth.uid())));

drop policy if exists trabajos_update on public.trabajos;
create policy trabajos_update on public.trabajos
for update to authenticated
using (public.es_admin((select auth.uid())) or responsable_user_id = (select auth.uid()))
with check (public.es_admin((select auth.uid())) or responsable_user_id = (select auth.uid()));

drop policy if exists trabajos_delete on public.trabajos;
create policy trabajos_delete on public.trabajos
for delete to authenticated
using (public.es_admin((select auth.uid())));

comment on table public.trabajos is 'Unidad operativa de producción: separa área, ubicación, responsable y estado para cada trabajo de un pedido.';
comment on column public.trabajos.area is 'Qué proceso realiza el trabajo.';
comment on column public.trabajos.ubicacion is 'Dónde se ejecuta físicamente el trabajo.';
comment on column public.trabajos.responsable_user_id is 'Responsable interno autenticado.';
comment on column public.trabajos.participante_id is 'Profesional o servicio externo del ecosistema cuando el trabajo es externo.';
