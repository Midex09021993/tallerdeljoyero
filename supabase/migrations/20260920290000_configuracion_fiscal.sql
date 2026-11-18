create table if not exists public.configuracion_fiscal (
  id uuid primary key default gen_random_uuid(),
  pais_codigo text not null unique,
  pais_nombre text not null,
  impuesto_nombre text not null default 'IGV',
  tasa numeric(6,3) not null default 0 check (tasa >= 0 and tasa <= 100),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.configuracion_fiscal (pais_codigo,pais_nombre,impuesto_nombre,tasa)
values ('PE','Perú','IGV',18)
on conflict (pais_codigo) do update set pais_nombre=excluded.pais_nombre, impuesto_nombre=excluded.impuesto_nombre;

alter table public.configuracion_fiscal enable row level security;
drop policy if exists configuracion_fiscal_select on public.configuracion_fiscal;
create policy configuracion_fiscal_select on public.configuracion_fiscal for select to authenticated using (true);
drop policy if exists configuracion_fiscal_manage on public.configuracion_fiscal;
create policy configuracion_fiscal_manage on public.configuracion_fiscal for all to authenticated using (public.es_admin(auth.uid())) with check (public.es_admin(auth.uid()));

create or replace function public.obtener_configuracion_fiscal(_pais_codigo text default 'PE')
returns jsonb language sql security definer set search_path=public as $$
  select coalesce((select jsonb_build_object('pais_codigo',pais_codigo,'pais_nombre',pais_nombre,'impuesto_nombre',impuesto_nombre,'tasa',tasa,'activo',activo)
    from public.configuracion_fiscal where pais_codigo=upper(_pais_codigo) and activo=true limit 1),'{}'::jsonb);
$$;
grant execute on function public.obtener_configuracion_fiscal(text) to authenticated;

create or replace function public.guardar_configuracion_fiscal(_pais_codigo text,_pais_nombre text,_impuesto_nombre text,_tasa numeric,_activo boolean default true)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not public.es_admin(auth.uid()) then raise exception 'No autorizado'; end if;
  insert into public.configuracion_fiscal(pais_codigo,pais_nombre,impuesto_nombre,tasa,activo)
  values(upper(trim(_pais_codigo)),trim(_pais_nombre),trim(_impuesto_nombre),_tasa,_activo)
  on conflict(pais_codigo) do update set pais_nombre=excluded.pais_nombre, impuesto_nombre=excluded.impuesto_nombre, tasa=excluded.tasa, activo=excluded.activo, updated_at=now()
  returning id into v_id;
  return jsonb_build_object('id',v_id);
end;
$$;
grant execute on function public.guardar_configuracion_fiscal(text,text,text,numeric,boolean) to authenticated;
