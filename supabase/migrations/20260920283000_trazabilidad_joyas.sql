create table if not exists public.inventario_joya_eventos (
  id uuid primary key default gen_random_uuid(),
  joya_id uuid not null references public.inventario_joyas(id) on delete cascade,
  sede_id uuid not null references public.sedes(id),
  tipo text not null,
  estado_anterior text not null default '',
  estado_nuevo text not null default '',
  nota text not null default '',
  usuario_id uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint inventario_joya_eventos_tipo_chk check (tipo in ('ingreso','actualizacion','cambio_estado','importacion','ajuste','movimiento','vinculacion'))
);

create index if not exists inventario_joya_eventos_joya_idx on public.inventario_joya_eventos (joya_id, created_at desc);
create index if not exists inventario_joya_eventos_sede_idx on public.inventario_joya_eventos (sede_id, created_at desc);

alter table public.inventario_joya_eventos enable row level security;

drop policy if exists "joya_eventos_select_sede" on public.inventario_joya_eventos;
create policy "joya_eventos_select_sede" on public.inventario_joya_eventos
for select to authenticated
using (exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid())
    and p.sede_id = inventario_joya_eventos.sede_id
    and p.activo = true
));

create or replace function public.registrar_evento_joya()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare v_tipo text; v_nota text;
begin
  if tg_op = 'INSERT' then
    v_tipo := case when coalesce(new.origen,'app') = 'importacion' then 'importacion' else 'ingreso' end;
    v_nota := case when v_tipo = 'importacion' then 'Ingreso mediante importación de inventario' else 'Ingreso de joya al inventario' end;
    insert into public.inventario_joya_eventos
      (joya_id,sede_id,tipo,estado_anterior,estado_nuevo,nota,usuario_id)
    values (new.id,new.sede_id,v_tipo,'',coalesce(new.estado,''),v_nota,(select auth.uid()));
    return new;
  end if;
  if new.estado is distinct from old.estado then
    insert into public.inventario_joya_eventos
      (joya_id,sede_id,tipo,estado_anterior,estado_nuevo,nota,usuario_id)
    values (new.id,new.sede_id,'cambio_estado',coalesce(old.estado,''),coalesce(new.estado,''),'Cambio de estado de inventario',(select auth.uid()));
  elsif row(new.codigo,new.nombre,new.metal,new.ley,new.peso,new.talla,new.piedras,new.cantidad)
        is distinct from row(old.codigo,old.nombre,old.metal,old.ley,old.peso,old.talla,old.piedras,old.cantidad) then
    insert into public.inventario_joya_eventos
      (joya_id,sede_id,tipo,estado_anterior,estado_nuevo,nota,usuario_id)
    values (new.id,new.sede_id,'actualizacion',coalesce(old.estado,''),coalesce(new.estado,''),'Actualización de ficha de joya',(select auth.uid()));
  end if;
  return new;
end;
$$;

drop trigger if exists inventario_joya_eventos_trg on public.inventario_joyas;
create trigger inventario_joya_eventos_trg after insert or update on public.inventario_joyas
for each row execute function public.registrar_evento_joya();

revoke all on function public.registrar_evento_joya() from public, anon, authenticated;
grant select on public.inventario_joya_eventos to authenticated;
