create table if not exists public.trabajo_tiempos (
  id uuid primary key default gen_random_uuid(),
  trabajo_id uuid not null references public.trabajos(id) on delete cascade,
  usuario_id uuid not null,
  inicio timestamptz not null default now(),
  fin timestamptz,
  segundos_acumulados integer not null default 0,
  motivo_pausa text not null default '',
  created_at timestamptz not null default now(),
  constraint trabajo_tiempos_rango_check check (fin is null or fin >= inicio),
  constraint trabajo_tiempos_segundos_check check (segundos_acumulados >= 0)
);
create index if not exists trabajo_tiempos_trabajo_idx on public.trabajo_tiempos(trabajo_id, inicio desc);
create index if not exists trabajo_tiempos_usuario_idx on public.trabajo_tiempos(usuario_id, inicio desc);
alter table public.trabajo_tiempos enable row level security;
drop policy if exists "tiempos leer sede" on public.trabajo_tiempos;
create policy "tiempos leer sede" on public.trabajo_tiempos for select to authenticated using (exists (select 1 from public.trabajos t where t.id=trabajo_id and ve_sede(auth.uid(),t.sede_id)));
drop policy if exists "tiempos crear propio" on public.trabajo_tiempos;
create policy "tiempos crear propio" on public.trabajo_tiempos for insert to authenticated with check (usuario_id=auth.uid() and exists (select 1 from public.trabajos t where t.id=trabajo_id and ve_sede(auth.uid(),t.sede_id)));
drop policy if exists "tiempos actualizar propio" on public.trabajo_tiempos;
create policy "tiempos actualizar propio" on public.trabajo_tiempos for update to authenticated using (usuario_id=auth.uid() and exists (select 1 from public.trabajos t where t.id=trabajo_id and ve_sede(auth.uid(),t.sede_id))) with check (usuario_id=auth.uid() and exists (select 1 from public.trabajos t where t.id=trabajo_id and ve_sede(auth.uid(),t.sede_id)));